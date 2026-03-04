CREATE OR REPLACE FUNCTION public.soft_delete_ordem_servico(_os_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'gestor_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para excluir OS';
  END IF;

  UPDATE public.ordens_servico
  SET deleted_at = now(), updated_at = now()
  WHERE id = _os_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OS não encontrada ou já excluída';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_ordem_servico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_ordem_servico(uuid) TO authenticated;