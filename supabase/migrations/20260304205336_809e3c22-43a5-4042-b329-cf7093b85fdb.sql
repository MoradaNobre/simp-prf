-- Bypass RLS edge-case on soft delete for chamados via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.soft_delete_chamado(_chamado_id uuid)
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
    RAISE EXCEPTION 'Sem permissão para excluir chamado';
  END IF;

  UPDATE public.chamados
  SET deleted_at = now(), updated_at = now()
  WHERE id = _chamado_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_chamado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_chamado(uuid) TO authenticated;