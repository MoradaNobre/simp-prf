ALTER TABLE public.uops 
  ADD COLUMN tipo_equipamento text DEFAULT NULL,
  ADD COLUMN tombamento text DEFAULT NULL,
  ADD COLUMN numero_serie text DEFAULT NULL;