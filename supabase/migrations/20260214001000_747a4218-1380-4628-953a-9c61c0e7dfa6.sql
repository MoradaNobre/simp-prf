
-- Fix user_regionais: gestor_regional can view all user_regionais (no self-reference)
DROP POLICY IF EXISTS "Gestor regional can view regional user_regionais" ON public.user_regionais;

CREATE POLICY "Gestor regional can view regional user_regionais"
ON public.user_regionais FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role));

-- Fix profiles: gestor_regional can view all profiles (no reference to user_regionais)
DROP POLICY IF EXISTS "Gestor regional can view regional profiles" ON public.profiles;

CREATE POLICY "Gestor regional can view regional profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role));

-- Also fix contratos policy that directly references user_regionais (potential recursion source)
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;

CREATE POLICY "Authenticated can view contratos"
ON public.contratos FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT public.get_user_regional_ids(auth.uid())))
  )
  OR (has_role(auth.uid(), 'preposto'::app_role) AND preposto_user_id = auth.uid())
);

-- Fix ordens_servico SELECT policy that directly references user_regionais
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;

CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND (uop_id IS NULL OR uop_id IN (
      SELECT u.id FROM uops u
      JOIN delegacias d ON u.delegacia_id = d.id
      WHERE d.regional_id IN (SELECT public.get_user_regional_ids(auth.uid()))
    ))
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
