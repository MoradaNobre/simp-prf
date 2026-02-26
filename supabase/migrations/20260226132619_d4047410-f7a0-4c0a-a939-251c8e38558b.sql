
-- Fix: When OS is deleted, unlink chamados instead of deleting them
-- First drop existing FK if it has CASCADE
ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_os_id_fkey;

-- Re-add with SET NULL so chamados survive OS deletion
ALTER TABLE public.chamados 
  ADD CONSTRAINT chamados_os_id_fkey 
  FOREIGN KEY (os_id) REFERENCES public.ordens_servico(id) ON DELETE SET NULL;

-- Create a trigger to reset chamado status when os_id becomes null
CREATE OR REPLACE FUNCTION public.reset_chamado_on_os_unlink()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.os_id IS NOT NULL AND NEW.os_id IS NULL THEN
    NEW.status = 'aberto';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reset_chamado_status_trigger
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_chamado_on_os_unlink();
