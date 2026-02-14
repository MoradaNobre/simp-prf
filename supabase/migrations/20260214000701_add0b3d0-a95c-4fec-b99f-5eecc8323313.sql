
-- Create a security definer function to get a user's regional IDs (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_user_regional_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regional_id FROM public.user_regionais WHERE user_id = _user_id
$$;

-- Create a security definer function to get user_ids in same regionals
CREATE OR REPLACE FUNCTION public.get_users_in_same_regionals(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id FROM public.user_regionais ur
  WHERE ur.regional_id IN (
    SELECT regional_id FROM public.user_regionais WHERE user_id = _user_id
  )
$$;

-- Fix user_regionais policies
DROP POLICY IF EXISTS "Gestor regional can view regional user_regionais" ON public.user_regionais;

CREATE POLICY "Gestor regional can view regional user_regionais"
ON public.user_regionais FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (SELECT public.get_user_regional_ids(auth.uid()))
);

-- Fix profiles policies
DROP POLICY IF EXISTS "Gestor regional can view regional profiles" ON public.profiles;

CREATE POLICY "Gestor regional can view regional profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND user_id IN (SELECT public.get_users_in_same_regionals(auth.uid()))
);

-- Fix delegacias policy that references user_regionais
DROP POLICY IF EXISTS "Gestor regional can manage delegacias" ON public.delegacias;

CREATE POLICY "Gestor regional can manage delegacias"
ON public.delegacias FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (SELECT public.get_user_regional_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (SELECT public.get_user_regional_ids(auth.uid()))
);

-- Fix uops policy that references user_regionais via delegacias
DROP POLICY IF EXISTS "Gestor regional can manage uops" ON public.uops;

CREATE POLICY "Gestor regional can manage uops"
ON public.uops FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND delegacia_id IN (
    SELECT d.id FROM public.delegacias d
    WHERE d.regional_id IN (SELECT public.get_user_regional_ids(auth.uid()))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND delegacia_id IN (
    SELECT d.id FROM public.delegacias d
    WHERE d.regional_id IN (SELECT public.get_user_regional_ids(auth.uid()))
  )
);
