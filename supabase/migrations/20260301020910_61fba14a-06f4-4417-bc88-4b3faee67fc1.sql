
-- =============================================
-- 1. FIX: profiles - scope gestor_regional to own regionals
--    Add fiscal, operador visibility for same-regional users
--    Add preposto/terceirizado visibility for contract-related users
-- =============================================

-- Drop the overly broad gestor_regional policy
DROP POLICY IF EXISTS "Gestor regional can view regional profiles" ON public.profiles;

-- Recreate with regional scope
CREATE POLICY "Gestor regional can view regional profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM public.user_regionais ur
    WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Fiscal de contrato can view profiles in same regionals
CREATE POLICY "Fiscal can view regional profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM public.user_regionais ur
    WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Operador can view profiles in same regionals (needed for chamados/OS screens)
CREATE POLICY "Operador can view regional profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'operador'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM public.user_regionais ur
    WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Preposto can view profiles of users linked to their contracts
CREATE POLICY "Preposto can view contract profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'preposto'::app_role)
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cc.user_id FROM public.contrato_contatos cc
      WHERE cc.contrato_id IN (
        SELECT c.id FROM public.contratos c WHERE c.preposto_user_id = auth.uid()
      ) AND cc.user_id IS NOT NULL
    )
  )
);

-- Terceirizado can view own profile only (already covered by "Users can view own profile")

-- =============================================
-- 2. FIX: contrato_contatos - replace broad SELECT with scoped access
-- =============================================

DROP POLICY IF EXISTS "Authenticated can view contato" ON public.contrato_contatos;

-- Admins see all
CREATE POLICY "Admins can view all contatos"
ON public.contrato_contatos FOR SELECT
USING (is_admin(auth.uid()));

-- Nacional sees contatos of contracts in their regionals
CREATE POLICY "Nacional can view regional contatos"
ON public.contrato_contatos FOR SELECT
USING (
  is_nacional(auth.uid())
  AND contrato_id IN (
    SELECT c.id FROM public.contratos c
    WHERE c.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Gestor regional and fiscal see contatos of contracts in their regionals
CREATE POLICY "Regional and fiscal can view contatos"
ON public.contrato_contatos FOR SELECT
USING (
  (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role))
  AND contrato_id IN (
    SELECT c.id FROM public.contratos c
    WHERE c.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Preposto sees contatos of own contracts
CREATE POLICY "Preposto can view own contract contatos"
ON public.contrato_contatos FOR SELECT
USING (
  has_role(auth.uid(), 'preposto'::app_role)
  AND contrato_id IN (
    SELECT c.id FROM public.contratos c WHERE c.preposto_user_id = auth.uid()
  )
);

-- Terceirizado sees contatos of contracts they belong to
CREATE POLICY "Terceirizado can view own contract contatos"
ON public.contrato_contatos FOR SELECT
USING (
  has_role(auth.uid(), 'terceirizado'::app_role)
  AND contrato_id IN (
    SELECT cc.contrato_id FROM public.contrato_contatos cc WHERE cc.user_id = auth.uid()
  )
);

-- =============================================
-- 3. FIX: user_roles - scope gestor_regional to own regionals
--    Add fiscal_contrato scoped view
-- =============================================

DROP POLICY IF EXISTS "Gestor regional can view roles" ON public.user_roles;

-- Gestor regional can only see roles of users in their regionals
CREATE POLICY "Gestor regional can view regional roles"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM public.user_regionais ur
    WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Fiscal can view roles of users in their regionals
CREATE POLICY "Fiscal can view regional roles"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM public.user_regionais ur
    WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);
