
-- Add new status values to os_status enum
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'orcamento' AFTER 'triagem';
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'autorizacao' AFTER 'orcamento';
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'ateste' AFTER 'execucao';
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'pagamento' AFTER 'ateste';

-- Add columns for budget and payment documents
ALTER TABLE public.ordens_servico 
  ADD COLUMN IF NOT EXISTS valor_orcamento numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arquivo_orcamento text,
  ADD COLUMN IF NOT EXISTS documentos_pagamento jsonb DEFAULT '[]'::jsonb;
