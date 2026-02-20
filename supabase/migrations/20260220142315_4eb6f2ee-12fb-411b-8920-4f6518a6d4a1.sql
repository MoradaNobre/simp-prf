-- Make os_id nullable to allow standalone credit requests
ALTER TABLE public.solicitacoes_credito ALTER COLUMN os_id DROP NOT NULL;

-- Make saldo_contrato default to 0 (not relevant for standalone requests)
ALTER TABLE public.solicitacoes_credito ADD COLUMN IF NOT EXISTS valor_solicitado numeric NOT NULL DEFAULT 0;
