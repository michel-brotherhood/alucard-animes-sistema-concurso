-- 1. Tabela de pedidos de acesso
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  granted_role public.app_role,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Usuário vê seu próprio pedido
CREATE POLICY "Users can view own request"
  ON public.access_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin vê todos
CREATE POLICY "Admins can view all requests"
  ON public.access_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Admin pode atualizar (via RPC, mas habilita backup)
CREATE POLICY "Admins can update requests"
  ON public.access_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- INSERT só via trigger (security definer)

-- Trigger updated_at
CREATE TRIGGER trg_access_requests_updated
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Substituir handle_new_user para criar perfil + (admin se 1º) ou pedido pendente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  -- Cria profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;

  -- Conta usuários existentes (excluindo o recém-criado)
  SELECT count(*) INTO user_count FROM auth.users WHERE id <> NEW.id;

  IF user_count = 0 THEN
    -- Primeiro usuário do sistema vira admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.access_requests (user_id, email, display_name, status, granted_role, reviewed_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name', 'approved', 'admin', now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Demais usuários: pedido pendente
    INSERT INTO public.access_requests (user_id, email, display_name, status)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name', 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Garantir trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RPC: listar pedidos pendentes (admin)
CREATE OR REPLACE FUNCTION public.list_access_requests(_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  status text,
  granted_role public.app_role,
  created_at timestamptz,
  reviewed_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT a.id, a.user_id, a.email, a.display_name, a.status, a.granted_role, a.created_at, a.reviewed_at
  FROM public.access_requests a
  WHERE _status IS NULL OR a.status = _status
  ORDER BY a.created_at DESC;
END;
$$;

-- 4. RPC: aprovar pedido com papel escolhido
CREATE OR REPLACE FUNCTION public.approve_access_request(_request_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT user_id INTO _target_user FROM public.access_requests WHERE id = _request_id AND status = 'pending';
  IF _target_user IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já processado';
  END IF;

  -- viewer = sem role (apenas autenticado). Não inserimos role.
  IF _role IS NOT NULL AND _role::text <> 'viewer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.access_requests
  SET status = 'approved',
      granted_role = _role,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

-- 5. RPC: recusar pedido
CREATE OR REPLACE FUNCTION public.reject_access_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.access_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = _request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já processado';
  END IF;
END;
$$;

-- 6. RPC: status do meu pedido (qualquer autenticado)
CREATE OR REPLACE FUNCTION public.my_access_request_status()
RETURNS TABLE(status text, granted_role public.app_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, granted_role FROM public.access_requests WHERE user_id = auth.uid() LIMIT 1;
$$;