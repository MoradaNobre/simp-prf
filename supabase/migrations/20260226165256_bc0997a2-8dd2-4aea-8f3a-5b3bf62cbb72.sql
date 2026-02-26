
DROP POLICY IF EXISTS "Users can create chamados" ON public.chamados;

CREATE POLICY "Users can create chamados"
ON public.chamados
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = solicitante_id)
  AND (NOT has_role(auth.uid(), 'preposto'::app_role))
  AND (NOT has_role(auth.uid(), 'terceirizado'::app_role))
  AND (
    -- Master e Nacional podem criar em qualquer regional
    is_admin(auth.uid())
    OR is_nacional(auth.uid())
    -- Demais perfis só nas suas regionais
    OR (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);
