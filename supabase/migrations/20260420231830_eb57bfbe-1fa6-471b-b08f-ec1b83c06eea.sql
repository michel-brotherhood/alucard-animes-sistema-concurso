CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_set_password(_email text, _new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $$
DECLARE
  _target uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem redefinir senhas';
  END IF;

  IF _new_password IS NULL OR length(_new_password) < 8 THEN
    RAISE EXCEPTION 'Senha precisa ter no mínimo 8 caracteres';
  END IF;

  SELECT id INTO _target FROM auth.users WHERE email = lower(_email) LIMIT 1;
  IF _target IS NULL THEN
    SELECT id INTO _target FROM auth.users WHERE email = _email LIMIT 1;
  END IF;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', _email;
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = _target;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_password(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_password(text, text) TO authenticated;