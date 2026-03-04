-- Fix: user_roles SELECT policy was RESTRICTIVE and blocked non-fiscal users (including gestor_master)
-- Make it PERMISSIVE so access is granted when any allowed rule matches.
DROP POLICY IF EXISTS "Fiscal can view regional roles" ON public.user_roles;

CREATE POLICY "Fiscal can view regional roles"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
  )
  AND user_id IN (
    SELECT ur.user_id
    FROM public.user_regionais ur
    WHERE ur.regional_id IN (
      SELECT get_user_regional_ids(auth.uid())
    )
  )
);