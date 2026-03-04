
CREATE OR REPLACE FUNCTION public.soft_delete_contrato(_contrato_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _regional_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Get the contract's regional_id
  SELECT regional_id INTO _regional_id
  FROM public.contratos
  WHERE id = _contrato_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado ou já excluído';
  END IF;

  -- Check permissions: same logic as DELETE RLS policy
  IF NOT (
    public.is_admin(auth.uid())
    OR (public.is_nacional(auth.uid()) AND public.user_has_regional(auth.uid(), _regional_id))
    OR (public.has_role(auth.uid(), 'gestor_regional'::app_role) AND _regional_id IS NOT NULL AND public.user_has_regional(auth.uid(), _regional_id))
    OR ((public.has_role(auth.uid(), 'fiscal_contrato'::app_role) OR public.has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND (_regional_id IS NULL OR public.user_has_regional(auth.uid(), _regional_id)))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para excluir este contrato';
  END IF;

  UPDATE public.contratos
  SET deleted_at = now(), updated_at = now()
  WHERE id = _contrato_id AND deleted_at IS NULL;
END;
$$;
