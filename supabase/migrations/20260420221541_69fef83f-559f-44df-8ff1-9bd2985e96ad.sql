-- Função para listar todos os usuários com seus papéis (apenas admins)
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  roles app_role[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem listar usuários';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    p.display_name,
    u.created_at,
    COALESCE(
      ARRAY(
        SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = u.id
      ),
      ARRAY[]::app_role[]
    ) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Função para conceder/revogar papel (apenas admins; bloqueia auto-rebaixamento de admin)
CREATE OR REPLACE FUNCTION public.set_user_role(
  _user_id uuid,
  _role app_role,
  _grant boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem alterar papéis';
  END IF;

  -- Impede que o admin remova o próprio papel de admin
  IF _grant = false AND _role = 'admin' AND _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode revogar seu próprio papel de admin';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

-- Garante uniqueness para suportar ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key
  ON public.user_roles (user_id, role);