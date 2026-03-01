-- Fix profiles visibility: this policy must be PERMISSIVE, not RESTRICTIVE,
-- otherwise non-preposto users (including gestor_master) are blocked from SELECT.

DROP POLICY IF EXISTS "Preposto can view contract profiles" ON public.profiles;

CREATE POLICY "Preposto can view contract profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'preposto')
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cc.user_id
      FROM contrato_contatos cc
      WHERE cc.contrato_id = ANY(get_preposto_contrato_ids(auth.uid()))
        AND cc.user_id IS NOT NULL
    )
  )
);