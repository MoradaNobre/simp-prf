-- =============================================
-- DUMP SQL - SIMP PRF
-- Gerado em: 2026-02-16
-- =============================================

-- ============ ENUMS ============

CREATE TYPE public.app_role AS ENUM (
  'gestor_nacional','gestor_regional','fiscal_contrato','operador','preposto','terceirizado'
);

CREATE TYPE public.equipment_category AS ENUM (
  'ar_condicionado','gerador','eletrica','telhado','hidraulica','elevador','outro'
);

CREATE TYPE public.frequencia_manutencao AS ENUM (
  'mensal','trimestral','semestral','anual'
);

CREATE TYPE public.os_prioridade AS ENUM (
  'baixa','media','alta','urgente'
);

CREATE TYPE public.os_status AS ENUM (
  'aberta','orcamento','autorizacao','execucao','ateste','pagamento','encerrada'
);

CREATE TYPE public.os_tipo AS ENUM (
  'corretiva','preventiva'
);

-- ============ TABELAS ============

CREATE TABLE public.regionais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  sigla text NOT NULL,
  uf text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delegacias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  municipio text,
  regional_id uuid NOT NULL REFERENCES public.regionais(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.uops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  endereco text,
  latitude double precision,
  longitude double precision,
  area_m2 double precision,
  delegacia_id uuid NOT NULL REFERENCES public.delegacias(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.equipamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  marca text,
  modelo text,
  numero_serie text,
  categoria equipment_category NOT NULL DEFAULT 'outro',
  qr_code text,
  observacoes text,
  data_instalacao date,
  uop_id uuid NOT NULL REFERENCES public.uops(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text,
  ativo boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  regional_id uuid REFERENCES public.regionais(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL
);

CREATE TABLE public.user_regionais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  regional_id uuid NOT NULL REFERENCES public.regionais(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contratos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  empresa text NOT NULL,
  objeto text,
  valor_total numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status text NOT NULL DEFAULT 'vigente',
  tipo_servico text NOT NULL DEFAULT 'manutencao_predial',
  preposto_nome text,
  preposto_email text,
  preposto_telefone text,
  preposto_user_id uuid,
  regional_id uuid REFERENCES public.regionais(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contrato_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id),
  nome text NOT NULL,
  email text,
  telefone text,
  funcao text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ordens_servico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo os_tipo NOT NULL DEFAULT 'corretiva',
  prioridade os_prioridade NOT NULL DEFAULT 'media',
  status os_status NOT NULL DEFAULT 'aberta',
  solicitante_id uuid NOT NULL,
  responsavel_id uuid,
  responsavel_execucao_id uuid,
  responsavel_encerramento_id uuid,
  contrato_id uuid REFERENCES public.contratos(id),
  equipamento_id uuid REFERENCES public.equipamentos(id),
  uop_id uuid REFERENCES public.uops(id),
  regional_id uuid REFERENCES public.regionais(id),
  valor_orcamento numeric DEFAULT 0,
  arquivo_orcamento text,
  foto_antes text,
  foto_depois text,
  assinatura_digital text,
  motivo_restituicao text,
  documentos_pagamento jsonb DEFAULT '[]',
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_encerramento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.os_custos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id),
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'peca',
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.regional_os_seq (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regional_id uuid NOT NULL UNIQUE REFERENCES public.regionais(id),
  last_number integer NOT NULL DEFAULT 0
);

CREATE TABLE public.planos_manutencao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  categoria equipment_category NOT NULL,
  frequencia frequencia_manutencao NOT NULL,
  descricao_atividades text,
  ativo boolean NOT NULL DEFAULT true,
  proxima_execucao date,
  uop_id uuid REFERENCES public.uops(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orcamento_anual (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regional_id uuid NOT NULL REFERENCES public.regionais(id),
  exercicio integer NOT NULL,
  valor_dotacao numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orcamento_creditos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id uuid NOT NULL REFERENCES public.orcamento_anual(id),
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'inicial',
  valor numeric NOT NULL DEFAULT 0,
  data_credito date NOT NULL DEFAULT CURRENT_DATE,
  numero_documento text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orcamento_empenhos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id uuid NOT NULL REFERENCES public.orcamento_anual(id),
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_empenho date NOT NULL DEFAULT CURRENT_DATE,
  numero_empenho text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.relatorios_execucao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id),
  codigo_os text NOT NULL,
  titulo_os text NOT NULL,
  valor_orcamento numeric NOT NULL DEFAULT 0,
  dados_json jsonb NOT NULL DEFAULT '{}',
  gerado_por_id uuid NOT NULL,
  contrato_id uuid REFERENCES public.contratos(id),
  contrato_numero text,
  contrato_empresa text,
  regional_id uuid REFERENCES public.regionais(id),
  email_enviado boolean NOT NULL DEFAULT false,
  email_destinatarios text[] DEFAULT '{}',
  gerado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.relatorios_os (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id),
  codigo_os text NOT NULL,
  titulo_os text NOT NULL,
  valor_atestado numeric NOT NULL DEFAULT 0,
  dados_json jsonb NOT NULL DEFAULT '{}',
  gerado_por_id uuid NOT NULL,
  contrato_numero text,
  contrato_empresa text,
  regional_id uuid REFERENCES public.regionais(id),
  gerado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ VIEW ============

CREATE OR REPLACE VIEW public.contratos_saldo AS
SELECT c.id, c.numero, c.empresa, c.valor_total,
  COALESCE(SUM(oc.valor), 0) AS total_custos,
  c.valor_total - COALESCE(SUM(oc.valor), 0) AS saldo
FROM contratos c
LEFT JOIN ordens_servico os ON os.contrato_id = c.id
LEFT JOIN os_custos oc ON oc.os_id = os.id
GROUP BY c.id, c.numero, c.empresa, c.valor_total;

-- ============ DADOS - PROFILES ============

INSERT INTO public.profiles (id, user_id, full_name, ativo, must_change_password, regional_id, created_at, updated_at) VALUES
('7382e1f2-82d5-44f9-bf56-e8b868046481', 'ff3d8343-fb96-4674-92ce-c064e35fd555', 'Daniel Nunes de Ávila', true, false, 'c123096d-6864-42f7-b4cc-5869c633f259', '2026-02-12 19:35:18.806916+00', '2026-02-15 23:27:23.165106+00'),
('127d9bd6-07d9-4e83-ae0e-6c10c2adc62a', 'dad16c9f-01a1-470d-b21e-1841d58471cd', 'Teste PRF', true, false, 'c123096d-6864-42f7-b4cc-5869c633f259', '2026-02-15 23:14:22.548559+00', '2026-02-15 23:15:34.349049+00');

-- ============ DADOS - USER_ROLES ============

INSERT INTO public.user_roles (id, user_id, role) VALUES
('b102225c-bf43-4b09-8118-ea210dfb6cda', 'ff3d8343-fb96-4674-92ce-c064e35fd555', 'gestor_nacional'),
('10004ace-6fb5-427d-98a9-eb34bc33224f', 'dad16c9f-01a1-470d-b21e-1841d58471cd', 'gestor_regional');

-- ============ DADOS - USER_REGIONAIS ============

INSERT INTO public.user_regionais (id, user_id, regional_id, created_at) VALUES
('68b72cab-d0a8-4a86-8795-6f50dddea785', 'dad16c9f-01a1-470d-b21e-1841d58471cd', 'c123096d-6864-42f7-b4cc-5869c633f259', '2026-02-15 23:15:34.110437+00'),
('d2e624cc-52bc-432d-9eba-3097942142ce', 'ff3d8343-fb96-4674-92ce-c064e35fd555', 'c123096d-6864-42f7-b4cc-5869c633f259', '2026-02-15 23:27:22.938859+00');

-- ============ NOTA ============
-- As tabelas regionais, delegacias, uops e regional_os_seq contêm
-- centenas/milhares de registros. Para exportá-las com todos os dados,
-- use a aba Cloud > Database > Tables e clique no botão de exportação
-- em cada tabela.
--
-- Tabelas vazias neste momento:
-- contratos, contrato_contatos, ordens_servico, os_custos,
-- equipamentos, planos_manutencao, orcamento_anual, orcamento_creditos,
-- orcamento_empenhos, relatorios_execucao, relatorios_os, audit_logs
