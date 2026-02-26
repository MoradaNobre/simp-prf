
-- Update the reset trigger: when OS is unlinked, chamado goes back to 'analisado' (GUT already done)
CREATE OR REPLACE FUNCTION public.reset_chamado_on_os_unlink()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.os_id IS NOT NULL AND NEW.os_id IS NULL THEN
    -- If GUT was filled, go back to analisado; otherwise aberto
    IF NEW.gut_score IS NOT NULL THEN
      NEW.status = 'analisado';
    ELSE
      NEW.status = 'aberto';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
