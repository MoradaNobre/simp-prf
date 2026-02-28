
-- Remove DELETE policy from audit_logs (was restricted to gestor_master)
DROP POLICY IF EXISTS "Gestor master can delete logs" ON public.audit_logs;

-- Explicitly block UPDATE (redundant safety since no UPDATE policy exists, but ensures immutability)
-- No action needed as UPDATE is already blocked by default (no permissive UPDATE policy exists)

-- Block DELETE for ALL users by not having any DELETE policy
-- RLS is already enabled, so without a DELETE policy, no one can delete
