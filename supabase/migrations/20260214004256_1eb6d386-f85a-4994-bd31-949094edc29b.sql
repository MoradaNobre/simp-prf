
-- Drop and recreate FK on contrato_contatos to cascade on delete
ALTER TABLE public.contrato_contatos
  DROP CONSTRAINT contrato_contatos_contrato_id_fkey,
  ADD CONSTRAINT contrato_contatos_contrato_id_fkey
    FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;

-- Set contrato_id to NULL on ordens_servico when contract is deleted
ALTER TABLE public.ordens_servico
  DROP CONSTRAINT ordens_servico_contrato_id_fkey,
  ADD CONSTRAINT ordens_servico_contrato_id_fkey
    FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE SET NULL;
