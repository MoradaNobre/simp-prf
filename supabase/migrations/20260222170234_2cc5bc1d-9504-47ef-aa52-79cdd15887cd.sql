
-- Drop equipamentos table (handles cascade)
DROP TRIGGER IF EXISTS update_equipamentos_updated_at ON public.equipamentos;
DROP POLICY IF EXISTS "Authenticated can view equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Admins can manage equipamentos" ON public.equipamentos;
DROP TABLE IF EXISTS public.equipamentos CASCADE;

-- Now drop enum (planos_manutencao already converted to text)
DROP TYPE IF EXISTS public.equipment_category CASCADE;
