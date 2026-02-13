
-- Junction table for users with multiple regionais
CREATE TABLE public.user_regionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  regional_id uuid NOT NULL REFERENCES public.regionais(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, regional_id)
);

ALTER TABLE public.user_regionais ENABLE ROW LEVEL SECURITY;

-- Gestor Nacional can manage all, users can view their own
CREATE POLICY "Admins can manage user_regionais"
  ON public.user_regionais FOR ALL
  USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "Users can view own regionais"
  ON public.user_regionais FOR SELECT
  USING (auth.uid() = user_id);

-- Migrate existing data from profiles.regional_id
INSERT INTO public.user_regionais (user_id, regional_id)
SELECT user_id, regional_id FROM public.profiles
WHERE regional_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Helper function: check if user belongs to a regional
CREATE OR REPLACE FUNCTION public.user_has_regional(_user_id uuid, _regional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_regionais
    WHERE user_id = _user_id AND regional_id = _regional_id
  )
$$;

-- Update OS SELECT policy to filter by user's regionais
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS"
  ON public.ordens_servico FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor_nacional'::app_role)
    OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
    OR (
      (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND (
        uop_id IS NULL
        OR uop_id IN (
          SELECT u.id FROM uops u
          JOIN delegacias d ON u.delegacia_id = d.id
          JOIN user_regionais ur ON ur.regional_id = d.regional_id
          WHERE ur.user_id = auth.uid()
        )
      )
    )
    OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (
      SELECT id FROM contratos WHERE preposto_user_id = auth.uid()
    ))
    OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (
      responsavel_triagem_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    ))
  );

-- Update contratos SELECT policy to filter by user's regionais
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos"
  ON public.contratos FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor_nacional'::app_role)
    OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
    OR (
      (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND (
        regional_id IS NULL
        OR regional_id IN (
          SELECT regional_id FROM user_regionais WHERE user_id = auth.uid()
        )
      )
    )
    OR (has_role(auth.uid(), 'preposto'::app_role) AND preposto_user_id = auth.uid())
  );
