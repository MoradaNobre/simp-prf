-- Add unique constraint on regionais.sigla for upsert support
ALTER TABLE public.regionais ADD CONSTRAINT regionais_sigla_key UNIQUE (sigla);
