
ALTER TABLE public.contrato_contatos 
  DROP CONSTRAINT IF EXISTS contrato_contatos_user_id_fkey;

-- Recreate with ON DELETE SET NULL so deleting a user doesn't fail
ALTER TABLE public.contrato_contatos 
  ADD CONSTRAINT contrato_contatos_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
