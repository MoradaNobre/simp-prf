
-- Step 1: Create security definer helper functions to avoid RLS recursion

-- Function to get contrato_ids for a preposto user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_preposto_contrato_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(id), '{}')
  FROM contratos
  WHERE preposto_user_id = _user_id
$$;

-- Function to get contrato_ids for a terceirizado user via contrato_contatos (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_terceirizado_contrato_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(contrato_id), '{}')
  FROM contrato_contatos
  WHERE user_id = _user_id
$$;

-- Step 2: Drop all existing policies on contrato_contatos
DROP POLICY IF EXISTS "Deny anon access to contrato_contatos" ON public.contrato_contatos;
DROP POLICY IF EXISTS "Admins can view all contatos" ON public.contrato_contatos;
DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;
DROP POLICY IF EXISTS "Nacional can view regional contatos" ON public.contrato_contatos;
DROP POLICY IF EXISTS "Preposto can view own contract contatos" ON public.contrato_contatos;
DROP POLICY IF EXISTS "Regional and fiscal can view contatos" ON public.contrato_contatos;
DROP POLICY IF EXISTS "Terceirizado can view own contract contatos" ON public.contrato_contatos;

-- Step 3: Recreate policies using security definer functions instead of self-referencing subqueries

-- Block anon
CREATE POLICY "Deny anon access to contrato_contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Admins can view all
CREATE POLICY "Admins can view all contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Nacional can view regional contatos
CREATE POLICY "Nacional can view regional contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  is_nacional(auth.uid()) AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Regional and fiscal can view contatos
CREATE POLICY "Regional and fiscal can view contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato'))
  AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Preposto can view own contract contatos (uses security definer function)
CREATE POLICY "Preposto can view own contract contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid()))
);

-- Terceirizado can view own contract contatos (uses security definer function)
CREATE POLICY "Terceirizado can view own contract contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'terceirizado') AND contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
);

-- Authorized users can manage contatos (insert/update/delete)
CREATE POLICY "Authorized users can manage contatos"
ON public.contrato_contatos
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
  OR (has_role(auth.uid(), 'fiscal_contrato') AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
);
