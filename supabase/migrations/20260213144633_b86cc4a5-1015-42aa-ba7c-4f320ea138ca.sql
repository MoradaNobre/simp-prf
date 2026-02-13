
-- Step 1: Add new roles to app_role enum only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'preposto';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'terceirizado';
