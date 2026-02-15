-- Counter table for per-regional OS numbering
CREATE TABLE public.regional_os_seq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id uuid NOT NULL UNIQUE REFERENCES public.regionais(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

ALTER TABLE public.regional_os_seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage regional_os_seq"
ON public.regional_os_seq FOR ALL
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "Authenticated can view regional_os_seq"
ON public.regional_os_seq FOR SELECT
USING (true);

-- Seed counters for all existing regionais
INSERT INTO public.regional_os_seq (regional_id, last_number)
SELECT id, 0 FROM public.regionais;

-- Replace the trigger function to use per-regional numbering
CREATE OR REPLACE FUNCTION public.generate_os_codigo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sigla text;
  _next int;
BEGIN
  IF NEW.regional_id IS NOT NULL THEN
    SELECT r.sigla INTO _sigla FROM public.regionais r WHERE r.id = NEW.regional_id;

    -- Increment counter atomically
    UPDATE public.regional_os_seq
      SET last_number = last_number + 1
      WHERE regional_id = NEW.regional_id
      RETURNING last_number INTO _next;

    -- If no row yet (new regional added after migration), insert it
    IF _next IS NULL THEN
      INSERT INTO public.regional_os_seq (regional_id, last_number)
        VALUES (NEW.regional_id, 1)
        ON CONFLICT (regional_id) DO UPDATE SET last_number = regional_os_seq.last_number + 1
        RETURNING last_number INTO _next;
    END IF;

    NEW.codigo = 'OS-' || COALESCE(_sigla, 'SEM') || '-' || LPAD(_next::text, 5, '0');
  ELSE
    -- Fallback: use old global sequence for OS without regional
    NEW.codigo = 'OS-' || LPAD(nextval('public.os_codigo_seq')::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;