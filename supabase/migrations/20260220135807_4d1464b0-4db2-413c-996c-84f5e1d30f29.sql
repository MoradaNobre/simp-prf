-- Add 'faturamento' to os_status enum after 'ateste'
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'faturamento' AFTER 'ateste';
