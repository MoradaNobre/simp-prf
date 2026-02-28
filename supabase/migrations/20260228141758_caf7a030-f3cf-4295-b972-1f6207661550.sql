
-- Step 1: Add deleted_at columns
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Step 2: Create partial indexes
CREATE INDEX IF NOT EXISTS idx_ordens_servico_deleted_at ON public.ordens_servico (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chamados_deleted_at ON public.chamados (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contratos_deleted_at ON public.contratos (deleted_at) WHERE deleted_at IS NULL;
