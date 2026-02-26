
-- Add GUT columns to chamados table
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS gut_gravidade smallint,
  ADD COLUMN IF NOT EXISTS gut_urgencia smallint,
  ADD COLUMN IF NOT EXISTS gut_tendencia smallint,
  ADD COLUMN IF NOT EXISTS gut_score smallint;

-- Create validation trigger for chamados GUT
CREATE OR REPLACE FUNCTION public.validate_chamado_gut()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.gut_gravidade IS NOT NULL AND (NEW.gut_gravidade < 1 OR NEW.gut_gravidade > 5) THEN
    RAISE EXCEPTION 'gut_gravidade deve estar entre 1 e 5';
  END IF;
  IF NEW.gut_urgencia IS NOT NULL AND (NEW.gut_urgencia < 1 OR NEW.gut_urgencia > 5) THEN
    RAISE EXCEPTION 'gut_urgencia deve estar entre 1 e 5';
  END IF;
  IF NEW.gut_tendencia IS NOT NULL AND (NEW.gut_tendencia < 1 OR NEW.gut_tendencia > 5) THEN
    RAISE EXCEPTION 'gut_tendencia deve estar entre 1 e 5';
  END IF;
  -- Auto-calculate score
  IF NEW.gut_gravidade IS NOT NULL AND NEW.gut_urgencia IS NOT NULL AND NEW.gut_tendencia IS NOT NULL THEN
    NEW.gut_score = NEW.gut_gravidade * NEW.gut_urgencia * NEW.gut_tendencia;
  ELSE
    NEW.gut_score = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_chamado_gut_trigger
  BEFORE INSERT OR UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_chamado_gut();

-- Remove GUT trigger and columns from ordens_servico (moved to chamados)
DROP TRIGGER IF EXISTS validate_gut_trigger ON public.ordens_servico;
DROP FUNCTION IF EXISTS public.validate_gut_values();
ALTER TABLE public.ordens_servico
  DROP COLUMN IF EXISTS gut_gravidade,
  DROP COLUMN IF EXISTS gut_urgencia,
  DROP COLUMN IF EXISTS gut_tendencia,
  DROP COLUMN IF EXISTS gut_score;
