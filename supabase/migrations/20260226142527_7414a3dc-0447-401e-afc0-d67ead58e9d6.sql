
-- Add GUT matrix columns to ordens_servico
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS gut_gravidade smallint,
  ADD COLUMN IF NOT EXISTS gut_urgencia smallint,
  ADD COLUMN IF NOT EXISTS gut_tendencia smallint,
  ADD COLUMN IF NOT EXISTS gut_score smallint;

-- Add constraint for valid ranges (1-5)
CREATE OR REPLACE FUNCTION public.validate_gut_values()
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
    -- Auto-set prioridade based on GUT score
    IF NEW.gut_score >= 64 THEN
      NEW.prioridade = 'urgente';
    ELSIF NEW.gut_score >= 27 THEN
      NEW.prioridade = 'alta';
    ELSIF NEW.gut_score >= 8 THEN
      NEW.prioridade = 'media';
    ELSE
      NEW.prioridade = 'baixa';
    END IF;
  ELSE
    NEW.gut_score = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_gut_trigger
  BEFORE INSERT OR UPDATE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gut_values();
