
-- Fix profiles SELECT policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestor regional can view regional profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "Gestor regional can view regional profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND user_id IN (
    SELECT ur.user_id FROM user_regionais ur
    WHERE ur.regional_id IN (
      SELECT ur2.regional_id FROM user_regionais ur2 WHERE ur2.user_id = auth.uid()
    )
  )
);

-- Fix user_roles SELECT policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gestor regional can view roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Gestor regional can view roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role));

-- Fix user_regionais SELECT policies
DROP POLICY IF EXISTS "Users can view own regionais" ON public.user_regionais;
DROP POLICY IF EXISTS "Gestor regional can view regional user_regionais" ON public.user_regionais;

CREATE POLICY "Users can view own regionais"
ON public.user_regionais FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Gestor regional can view regional user_regionais"
ON public.user_regionais FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (
    SELECT ur.regional_id FROM user_regionais ur WHERE ur.user_id = auth.uid()
  )
);
