
-- Step 1: Add gestor_master to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_master';
