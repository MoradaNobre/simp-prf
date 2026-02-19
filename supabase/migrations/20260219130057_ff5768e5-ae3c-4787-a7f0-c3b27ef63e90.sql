
-- Fix: set the new view to SECURITY INVOKER (default, safe)
ALTER VIEW public.vw_orcamento_regional_saldo SET (security_invoker = on);
