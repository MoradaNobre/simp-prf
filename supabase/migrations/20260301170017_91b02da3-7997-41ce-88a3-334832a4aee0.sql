
-- Fix: "Deny anon access to profiles" was RESTRICTIVE FOR ALL roles, blocking everyone including authenticated users
-- Recreate it targeting ONLY the anon role

DROP POLICY IF EXISTS "Deny anon access to profiles" ON public.profiles;

CREATE POLICY "Deny anon access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
