
-- Migration: 20251102230337
-- Criar tabela de inscritos
CREATE TABLE public.inscritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cosplay TEXT NOT NULL,
  created BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM now()) * 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_inscritos_categoria ON public.inscritos(categoria);
CREATE INDEX idx_inscritos_created ON public.inscritos(created);

-- Habilitar RLS
ALTER TABLE public.inscritos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permite leitura e escrita para todos - sistema público)
CREATE POLICY "Permitir leitura pública de inscritos"
  ON public.inscritos
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de inscritos"
  ON public.inscritos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de inscritos"
  ON public.inscritos
  FOR UPDATE
  USING (true);

CREATE POLICY "Permitir exclusão pública de inscritos"
  ON public.inscritos
  FOR DELETE
  USING (true);

-- Criar tabela de notas
CREATE TABLE public.notas (
  id UUID PRIMARY KEY REFERENCES public.inscritos(id) ON DELETE CASCADE,
  jurado_1 DECIMAL(3,1),
  jurado_2 DECIMAL(3,1),
  jurado_3 DECIMAL(3,1),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permite leitura e escrita para todos - sistema público)
CREATE POLICY "Permitir leitura pública de notas"
  ON public.notas
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de notas"
  ON public.notas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de notas"
  ON public.notas
  FOR UPDATE
  USING (true);

CREATE POLICY "Permitir exclusão pública de notas"
  ON public.notas
  FOR DELETE
  USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inscritos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas;

-- Migration: 20251106020126
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'judge', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- user_roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop old public policies
DROP POLICY IF EXISTS "Permitir leitura pública de inscritos" ON public.inscritos;
DROP POLICY IF EXISTS "Permitir inserção pública de inscritos" ON public.inscritos;
DROP POLICY IF EXISTS "Permitir atualização pública de inscritos" ON public.inscritos;
DROP POLICY IF EXISTS "Permitir exclusão pública de inscritos" ON public.inscritos;

DROP POLICY IF EXISTS "Permitir leitura pública de notas" ON public.notas;
DROP POLICY IF EXISTS "Permitir inserção pública de notas" ON public.notas;
DROP POLICY IF EXISTS "Permitir atualização pública de notas" ON public.notas;
DROP POLICY IF EXISTS "Permitir exclusão pública de notas" ON public.notas;

-- New secure policies for inscritos
CREATE POLICY "Authenticated users can view participants"
ON public.inscritos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert participants"
ON public.inscritos FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update participants"
ON public.inscritos FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete participants"
ON public.inscritos FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- New secure policies for notas
CREATE POLICY "Authenticated users can view scores"
ON public.notas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Judges and admins can insert scores"
ON public.notas FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'judge') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Judges and admins can update scores"
ON public.notas FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'judge') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete scores"
ON public.notas FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating profile timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Migration: 20251106020312
-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Migration: 20251107202757
-- Drop all authentication-based policies
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.inscritos;
DROP POLICY IF EXISTS "Admins can insert participants" ON public.inscritos;
DROP POLICY IF EXISTS "Admins can update participants" ON public.inscritos;
DROP POLICY IF EXISTS "Admins can delete participants" ON public.inscritos;

DROP POLICY IF EXISTS "Authenticated users can view scores" ON public.notas;
DROP POLICY IF EXISTS "Judges and admins can insert scores" ON public.notas;
DROP POLICY IF EXISTS "Judges and admins can update scores" ON public.notas;
DROP POLICY IF EXISTS "Admins can delete scores" ON public.notas;

-- Restore public access policies
CREATE POLICY "Permitir leitura pública de inscritos"
ON public.inscritos FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção pública de inscritos"
ON public.inscritos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de inscritos"
ON public.inscritos FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão pública de inscritos"
ON public.inscritos FOR DELETE
USING (true);

CREATE POLICY "Permitir leitura pública de notas"
ON public.notas FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção pública de notas"
ON public.notas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de notas"
ON public.notas FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão pública de notas"
ON public.notas FOR DELETE
USING (true);
