-- Create sequence table for chamados (same approach as OS)
CREATE TABLE IF NOT EXISTS public.regional_chamado_seq (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regional_id uuid UNIQUE REFERENCES public.regionais(id),
  last_number integer NOT NULL DEFAULT 0
);

ALTER TABLE public.regional_chamado_seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chamado seq" ON public.regional_chamado_seq
  FOR ALL USING (is_admin(auth.uid()));

-- Seed sequence table with all existing regionais at 0
INSERT INTO public.regional_chamado_seq (regional_id, last_number)
SELECT id, 0 FROM public.regionais
ON CONFLICT (regional_id) DO UPDATE SET last_number = 0;

-- Replace the chamado code generation trigger function
CREATE OR REPLACE FUNCTION public.generate_chamado_codigo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sigla text;
  _next int;
BEGIN
  IF NEW.regional_id IS NOT NULL THEN
    SELECT r.sigla INTO _sigla FROM public.regionais r WHERE r.id = NEW.regional_id;

    UPDATE public.regional_chamado_seq
      SET last_number = last_number + 1
      WHERE regional_id = NEW.regional_id
      RETURNING last_number INTO _next;

    IF _next IS NULL THEN
      INSERT INTO public.regional_chamado_seq (regional_id, last_number)
        VALUES (NEW.regional_id, 1)
        ON CONFLICT (regional_id) DO UPDATE SET last_number = regional_chamado_seq.last_number + 1
        RETURNING last_number INTO _next;
    END IF;

    NEW.codigo = 'CH-' || COALESCE(_sigla, 'SEM') || '-' || LPAD(_next::text, 5, '0');
  ELSE
    UPDATE public.regional_chamado_seq
      SET last_number = last_number + 1
      WHERE regional_id IS NULL
      RETURNING last_number INTO _next;

    IF _next IS NULL THEN
      INSERT INTO public.regional_chamado_seq (regional_id, last_number)
        VALUES (NULL, 1)
        ON CONFLICT DO NOTHING;
      _next := 1;
    END IF;

    NEW.codigo = 'CH-SEM-' || LPAD(COALESCE(_next, 1)::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$function$;