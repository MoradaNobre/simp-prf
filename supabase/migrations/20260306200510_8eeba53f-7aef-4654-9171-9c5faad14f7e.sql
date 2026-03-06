-- Function to return users by role with their UFs for the map view
-- Uses SECURITY DEFINER to bypass RLS since this only exposes
-- first names and UF assignments (non-sensitive summary data)
CREATE OR REPLACE FUNCTION public.get_users_by_role_for_map(_role app_role)
RETURNS TABLE (
  uf text,
  user_name text,
  regional_sigla text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.uf,
    split_part(p.full_name, ' ', 1) AS user_name,
    r.sigla AS regional_sigla
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  JOIN public.user_regionais ure ON ure.user_id = ur.user_id
  JOIN public.regionais r ON r.id = ure.regional_id
  WHERE ur.role = _role
    AND p.ativo = true
  ORDER BY r.uf, user_name
$$;