
-- 1) Allow gestor_nacional to manage their own regionais
CREATE POLICY "Nacional can manage own regionais"
ON public.regionais
FOR ALL
USING (
  is_nacional(auth.uid())
  AND id IN (SELECT get_user_regional_ids(auth.uid()))
)
WITH CHECK (
  is_nacional(auth.uid())
  AND id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- 2) Allow gestor_nacional to manage LOA (currently can only view)
DROP POLICY IF EXISTS "Nacional can view LOA" ON public.orcamento_loa;

CREATE POLICY "Nacional can manage LOA"
ON public.orcamento_loa
FOR ALL
USING (is_nacional(auth.uid()))
WITH CHECK (is_nacional(auth.uid()));
