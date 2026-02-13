
ALTER TABLE public.contratos 
  ADD COLUMN regional_id uuid REFERENCES public.regionais(id);
