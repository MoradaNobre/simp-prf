
-- =============================================
-- SIMP-PRF Database Schema
-- =============================================

-- 1. User roles
CREATE TYPE public.app_role AS ENUM ('gestor_nacional', 'gestor_regional', 'fiscal_contrato', 'operador');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can see all roles, users can see their own
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "National managers can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_nacional'));

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_nacional'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Default role: operador
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Regionais (top of hierarchy)
CREATE TABLE public.regionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  uf TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view regionais" ON public.regionais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage regionais" ON public.regionais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_nacional'));

-- 4. Delegacias
CREATE TABLE public.delegacias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id UUID REFERENCES public.regionais(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  municipio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delegacias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view delegacias" ON public.delegacias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage delegacias" ON public.delegacias
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_nacional'));

-- 5. UOPs (Unidades Operacionais)
CREATE TABLE public.uops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegacia_id UUID REFERENCES public.delegacias(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  area_m2 DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view uops" ON public.uops
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage uops" ON public.uops
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_nacional'));

-- 6. Equipamentos (assets)
CREATE TYPE public.equipment_category AS ENUM (
  'ar_condicionado', 'gerador', 'eletrica', 'telhado', 'hidraulica', 'elevador', 'outro'
);

CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uop_id UUID REFERENCES public.uops(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  categoria equipment_category NOT NULL DEFAULT 'outro',
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  data_instalacao DATE,
  qr_code TEXT UNIQUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view equipamentos" ON public.equipamentos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage equipamentos" ON public.equipamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor_nacional'));

-- 7. Contratos
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  empresa TEXT NOT NULL,
  objeto TEXT,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contratos" ON public.contratos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fiscais and admins can manage contratos" ON public.contratos
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor_nacional') OR 
    public.has_role(auth.uid(), 'fiscal_contrato')
  );

-- 8. Ordens de Serviço
CREATE TYPE public.os_status AS ENUM ('aberta', 'triagem', 'execucao', 'encerrada');
CREATE TYPE public.os_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE public.os_tipo AS ENUM ('corretiva', 'preventiva');

CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status os_status NOT NULL DEFAULT 'aberta',
  prioridade os_prioridade NOT NULL DEFAULT 'media',
  tipo os_tipo NOT NULL DEFAULT 'corretiva',
  equipamento_id UUID REFERENCES public.equipamentos(id),
  uop_id UUID REFERENCES public.uops(id),
  contrato_id UUID REFERENCES public.contratos(id),
  solicitante_id UUID REFERENCES auth.users(id) NOT NULL,
  responsavel_id UUID REFERENCES auth.users(id),
  foto_antes TEXT,
  foto_depois TEXT,
  assinatura_digital TEXT,
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_encerramento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view OS" ON public.ordens_servico
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create OS" ON public.ordens_servico
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Managers can update OS" ON public.ordens_servico
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = solicitante_id OR
    auth.uid() = responsavel_id OR
    public.has_role(auth.uid(), 'gestor_nacional') OR
    public.has_role(auth.uid(), 'gestor_regional')
  );

-- 9. OS Custos (cost items per OS)
CREATE TABLE public.os_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'peca',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.os_custos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view custos" ON public.os_custos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fiscais and admins can manage custos" ON public.os_custos
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor_nacional') OR
    public.has_role(auth.uid(), 'fiscal_contrato')
  );

-- 10. Planos de Manutenção Preventiva
CREATE TYPE public.frequencia_manutencao AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');

CREATE TABLE public.planos_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria equipment_category NOT NULL,
  frequencia frequencia_manutencao NOT NULL,
  descricao_atividades TEXT,
  uop_id UUID REFERENCES public.uops(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  proxima_execucao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planos_manutencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view planos" ON public.planos_manutencao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage planos" ON public.planos_manutencao
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor_nacional') OR
    public.has_role(auth.uid(), 'gestor_regional')
  );

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_os_updated_at BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON public.planos_manutencao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence for OS codes
CREATE SEQUENCE public.os_codigo_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_os_codigo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.codigo = 'OS-' || LPAD(nextval('public.os_codigo_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_os_codigo BEFORE INSERT ON public.ordens_servico
  FOR EACH ROW WHEN (NEW.codigo IS NULL OR NEW.codigo = '')
  EXECUTE FUNCTION public.generate_os_codigo();
