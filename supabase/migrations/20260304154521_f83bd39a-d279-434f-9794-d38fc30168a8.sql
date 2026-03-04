
-- Fix: "Deny anon access to profiles" blocks ALL users because qual=false is RESTRICTIVE (AND logic)
-- Replace with a check that only blocks anonymous (not authenticated) users
DROP POLICY IF EXISTS "Deny anon access to profiles" ON public.profiles;

CREATE POLICY "Deny anon access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
