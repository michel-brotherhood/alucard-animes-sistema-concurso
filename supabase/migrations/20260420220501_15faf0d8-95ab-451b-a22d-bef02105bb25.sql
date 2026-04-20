-- 1. inscritos: somente admin pode mutar
DROP POLICY IF EXISTS "Permitir inserção pública de inscritos"   ON public.inscritos;
DROP POLICY IF EXISTS "Permitir atualização pública de inscritos" ON public.inscritos;
DROP POLICY IF EXISTS "Permitir exclusão pública de inscritos"   ON public.inscritos;

CREATE POLICY "Admins inserem inscritos" ON public.inscritos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins atualizam inscritos" ON public.inscritos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins deletam inscritos" ON public.inscritos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 2. notas: jurados/admin mutam, leitura pública mantida
DROP POLICY IF EXISTS "Permitir inserção pública de notas"   ON public.notas;
DROP POLICY IF EXISTS "Permitir atualização pública de notas" ON public.notas;
DROP POLICY IF EXISTS "Permitir exclusão pública de notas"   ON public.notas;

CREATE POLICY "Jurados inserem notas" ON public.notas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'juror') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Jurados atualizam notas" ON public.notas
  FOR UPDATE TO authenticated
  USING  (public.has_role(auth.uid(),'juror') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'juror') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins deletam notas" ON public.notas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 3. Integridade: FK com cascade (apaga órfãos antes)
DELETE FROM public.notas n WHERE NOT EXISTS (SELECT 1 FROM public.inscritos i WHERE i.id = n.id);

ALTER TABLE public.notas
  DROP CONSTRAINT IF EXISTS notas_id_fkey;

ALTER TABLE public.notas
  ADD CONSTRAINT notas_id_fkey FOREIGN KEY (id) REFERENCES public.inscritos(id) ON DELETE CASCADE;

-- 4. Validação server-side de range das notas
CREATE OR REPLACE FUNCTION public.validate_nota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.jurado_1 IS NOT NULL AND (NEW.jurado_1 < 0 OR NEW.jurado_1 > 10) THEN
    RAISE EXCEPTION 'jurado_1 fora do range 0-10';
  END IF;
  IF NEW.jurado_2 IS NOT NULL AND (NEW.jurado_2 < 0 OR NEW.jurado_2 > 10) THEN
    RAISE EXCEPTION 'jurado_2 fora do range 0-10';
  END IF;
  IF NEW.jurado_3 IS NOT NULL AND (NEW.jurado_3 < 0 OR NEW.jurado_3 > 10) THEN
    RAISE EXCEPTION 'jurado_3 fora do range 0-10';
  END IF;
  IF NEW.jurado_1 IS NOT NULL THEN NEW.jurado_1 := round(NEW.jurado_1, 2); END IF;
  IF NEW.jurado_2 IS NOT NULL THEN NEW.jurado_2 := round(NEW.jurado_2, 2); END IF;
  IF NEW.jurado_3 IS NOT NULL THEN NEW.jurado_3 := round(NEW.jurado_3, 2); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_nota ON public.notas;
CREATE TRIGGER trg_validate_nota
  BEFORE INSERT OR UPDATE ON public.notas
  FOR EACH ROW EXECUTE FUNCTION public.validate_nota();

-- 5. profiles: só dono ou admin
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Owner ou admin lê profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));