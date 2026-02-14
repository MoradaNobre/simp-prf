
-- Add regional_id column to ordens_servico for direct regional linkage
ALTER TABLE public.ordens_servico
ADD COLUMN regional_id uuid REFERENCES public.regionais(id);

-- Backfill existing OS that have a uop_id with the correct regional_id
UPDATE public.ordens_servico os
SET regional_id = d.regional_id
FROM public.uops u
JOIN public.delegacias d ON u.delegacia_id = d.id
WHERE os.uop_id = u.id AND os.regional_id IS NULL;
