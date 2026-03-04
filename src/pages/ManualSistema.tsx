import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  LayoutDashboard,
  MessageSquarePlus,
  ClipboardList,
  CalendarClock,
  FileBarChart,
  FileText,
  DollarSign,
  Shield,
  
  Users,
  MapPin,
  Building2,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  Plus,
  Edit,
  Trash2,
  Filter,
  Search,
  Download,
  Mail,
  Camera,
  Lock,
  Globe,
  Layers,
  TrendingUp,
  CircleDollarSign,
  FileCheck,
  Ban,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface ManualSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  features: ManualFeature[];
}

interface ManualFeature {
  title: string;
  description: string;
  details?: string[];
  roles?: string[];
  tip?: string;
}

/* ────────────────────────────────────────────── */
/*  Data                                          */
/* ────────────────────────────────────────────── */

const ROLE_COLORS: Record<string, string> = {
  "Gestor Master": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Gestor Nacional": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Gestor Regional": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Fiscal de Contrato": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Operador": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  "Preposto": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Terceirizado": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "Todos": "bg-primary/10 text-primary",
};

const SECTIONS: ManualSection[] = [
  {
    id: "visao-geral",
    title: "Visão Geral do Sistema",
    icon: BookOpen,
    color: "text-primary",
    description:
      "O SIMP-PRF (Sistema Integrado de Manutenção Predial) é o sistema oficial da Polícia Rodoviária Federal para gerenciamento de manutenção predial. Organizado em uma hierarquia de Regional → Delegacia → UOP, o sistema controla todo o ciclo de vida desde a abertura de chamados até o pagamento de serviços executados.",
    features: [
      {
        title: "Hierarquia Organizacional",
        description: "O sistema reflete a estrutura administrativa da PRF com três níveis hierárquicos.",
        details: [
          "Regional: Unidade administrativa superior, identificada por sigla e UF",
          "Delegacia: Subdivisão da regional, vinculada a um município",
          "UOP (Unidade Operacional): Unidade física onde os serviços são realizados, com endereço, área (m²) e coordenadas GPS",
        ],
      },
      {
        title: "Perfis de Acesso",
        description: "O sistema possui 7 perfis com diferentes níveis de permissão, garantindo segregação de funções.",
        details: [
          "Gestor Master: Acesso global a todas as regionais e funcionalidades; único perfil que pode excluir chamados e OS",
          "Gestor Nacional: Acesso administrativo restrito às regionais vinculadas ao seu perfil",
          "Gestor Regional: Gestão da sua regional, incluindo orçamento e contratos",
          "Fiscal de Contrato: Análise GUT, agrupamento de chamados em OS e fiscalização de contratos",
          "Operador: Abertura e acompanhamento de chamados na sua regional",
          "Preposto: Representante da empresa contratada, acesso às OS e agendamentos do contrato",
          "Terceirizado: Execução de serviços, visualização de OS atribuídas",
        ],
      },
      {
        title: "Fluxo Operacional Principal",
        description: "O ciclo de vida completo segue a sequência: Chamado → Análise GUT → Agrupamento → Ordem de Serviço → Execução → Pagamento.",
        details: [
          "1. Abertura do Chamado: Operador ou Fiscal registra a demanda de manutenção",
          "2. Análise GUT: Fiscal avalia Gravidade, Urgência e Tendência (escala 1-5)",
          "3. Agrupamento: Chamados analisados são vinculados a uma Ordem de Serviço",
           "4. Ciclo da OS: Aberta → Orçamento → Autorização → Execução → Receb. Serviço → Faturamento → Ateste → Encerrada",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600 dark:text-blue-400",
    description:
      "Painel gerencial com visão consolidada de indicadores operacionais e financeiros, dividido em quatro abas temáticas.",
    features: [
      {
        title: "Aba Chamados",
        description: "Indicadores quantitativos de chamados agrupados por status, tipo de demanda e prioridade.",
        details: [
          "Cards com total de chamados por status (Aberto, Analisado, Vinculado, Cancelado)",
          "Gráfico de barras com distribuição por tipo de demanda",
          "Filtro por regional disponível para gestores",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato", "Operador"],
      },
      {
        title: "Aba Ordens de Serviço",
        description: "Visão operacional do andamento das OS com gráficos de status e evolução temporal.",
        details: [
          "Distribuição de OS por etapa do fluxo (8 status possíveis)",
          "Gráfico de pizza por prioridade (Baixa, Média, Alta, Urgente)",
          "Indicador de OS em atraso ou com pendências",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato"],
      },
      {
        title: "Aba Orçamento",
        description: "Indicadores financeiros com saldo orçamentário por regional, consumo acumulado e projeções.",
        details: [
          "Dotação LOA vs. créditos suplementares vs. empenhos realizados",
          "Saldo disponível por regional com alertas de insuficiência",
          "Gráfico comparativo de execução orçamentária",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
      {
        title: "Aba Mapa",
        description: "Mapa do Brasil interativo com distribuição geográfica das regionais e indicadores por estado.",
        details: [
          "Mapa SVG clicável por UF/regional",
          "Indicadores sobrepostos: total de OS, chamados pendentes",
          "Cores refletem criticidade ou volume de demandas",
        ],
        roles: ["Gestor Master", "Gestor Nacional"],
      },
    ],
  },
  {
    id: "chamados",
    title: "Chamados",
    icon: MessageSquarePlus,
    color: "text-orange-600 dark:text-orange-400",
    description:
      "Módulo de registro e gestão de demandas de manutenção predial. É a etapa inicial obrigatória do fluxo operacional.",
    features: [
      {
        title: "Abertura de Chamado",
        description: "Formulário completo para registro de nova demanda de manutenção.",
         details: [
          "Campos obrigatórios: Tipo de Demanda, Descrição, Local do Serviço, Regional",
          "Campos opcionais: Delegacia, UOP, Foto anexa, Justificativa de urgência",
          "Para demandas de Ar Condicionado: o campo 'Patrimônio ou Nº de Série' é obrigatório",
          "Geração automática de código sequencial por regional",
          "Prioridade padrão 'Baixa' (ajustada após análise GUT)",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato", "Operador"],
      },
      {
        title: "Análise GUT (Matriz de Priorização)",
        description: "Avaliação objetiva de cada chamado usando a metodologia GUT (Gravidade × Urgência × Tendência).",
        details: [
          "Escala de 1 a 5 para cada dimensão (G, U, T)",
          "Score calculado automaticamente: G × U × T (máximo 125)",
          "A prioridade do chamado é derivada automaticamente do score GUT",
          "Chamado passa de 'Aberto' para 'Analisado' após avaliação GUT",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato"],
        tip: "A análise GUT é fundamental pois define a prioridade da Ordem de Serviço gerada a partir dos chamados vinculados.",
      },
      {
        title: "Ciclo de Vida dos Chamados",
        description: "Os chamados seguem um fluxo de três status principais.",
        details: [
          "Aberto: Chamado registrado, aguardando análise GUT",
          "Analisado: Chamado com GUT preenchido, disponível para agrupamento em OS",
          "Vinculado: Chamado já associado a uma Ordem de Serviço",
          "Cancelado: Chamado descartado com justificativa obrigatória",
        ],
      },
      {
        title: "Cancelamento de Chamado",
        description: "Chamados com status 'Aberto' podem ser cancelados mediante justificativa.",
        details: [
          "Botão de cancelamento (ícone Ban) disponível apenas para chamados abertos",
          "Justificativa de cancelamento é campo obrigatório",
          "Após cancelamento, o chamado não pode ser reaberto",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato", "Operador"],
        tip: "Operadores só podem cancelar seus próprios chamados.",
      },
      {
        title: "Listagem e Filtros",
        description: "A tela de chamados exibe todos os registros com filtros avançados.",
        details: [
          "Filtro padrão: 'Todos os Status'",
          "Ordenação principal por Score GUT (maior primeiro)",
          "Filtros por regional, status, prioridade e tipo de demanda",
          "Banners contextuais orientam o usuário conforme seu perfil",
        ],
      },
    ],
  },
  {
    id: "ordens-servico",
    title: "Ordens de Serviço",
    icon: ClipboardList,
    color: "text-green-600 dark:text-green-400",
    description:
      "Módulo central do sistema para gestão do ciclo completo de manutenção, desde a criação da OS até o encerramento com pagamento.",
    features: [
      {
        title: "Criação de OS",
        description: "Ordens de Serviço são criadas a partir do agrupamento de chamados analisados.",
        details: [
          "Campos: Título, Descrição, Regional, UOP, Contrato vinculado, Tipo (Corretiva/Preventiva)",
          "Vínculo com chamados analisados via GUT",
          "Código gerado automaticamente: [SIGLA_REGIONAL]-OS-[SEQUENCIAL]/[ANO]",
          "A prioridade da OS é derivada do maior score GUT dos chamados vinculados",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato"],
      },
      {
        title: "Fluxo de Status (8 etapas)",
        description: "A OS percorre 8 etapas obrigatórias, representadas visualmente por um stepper.",
        details: [
           "1. Aberta: OS criada, aguardando orçamento da empresa",
          "2. Orçamento: Preposto/terceirizado envia proposta de valor e arquivo",
          "3. Autorização: Gestor analisa orçamento, verifica saldos e autoriza ou restitui",
          "4. Execução: Serviço em andamento pela equipe contratada",
          "5. Receb. Serviço: Fiscal verifica execução, upload de foto 'depois' e autorização para emissão da NF",
          "6. Faturamento: Empresa emite nota fiscal e certidões exigidas",
          "7. Ateste: Gestor verifica NF/certidões, registra ateste e anexa documentos fiscais",
          "8. Encerrada: OS finalizada com todos os registros completos",
        ],
      },
      {
        title: "Bloqueios de Autorização (4 níveis)",
        description: "Na etapa de Autorização, o sistema verifica 4 condições obrigatórias para aprovar a OS.",
        details: [
          "1º Cota Regional: Saldo da dotação orçamentária da regional (bloqueio intransponível)",
          "2º Saldo do Contrato: Saldo disponível no contrato vinculado",
          "3º Limite Modalidade: Valor dentro do limite da modalidade de contratação",
          "4º Saldo do Empenho: Empenho suficiente para cobrir o valor",
          "O sistema exibe apenas o bloqueio de maior prioridade ativo",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
        tip: "Contratos 'Cartão Corporativo' abreviam o fluxo (Receb. Serviço → Encerrada). 'Contrata + Brasil' ignora bloqueios de saldo contratual.",
      },
      {
        title: "Evidências e Documentação",
        description: "Sistema de upload de evidências fotográficas e assinatura digital.",
        details: [
          "Foto Antes: Registrada na abertura ou orçamento",
          "Foto Depois: Registrada no ateste, comparação visual",
          "Arquivo de Orçamento: PDF ou imagem do orçamento da empresa",
          "Assinatura Digital: Capturada no ateste pelo fiscal",
          "Documentos de Pagamento: Notas fiscais e comprovantes",
        ],
      },
      {
        title: "Descrição Detalhada",
        description: "Gestores e fiscais podem refinar a descrição da OS na etapa 'Aberta'.",
        details: [
          "Campo de 'Descrição Detalhada' concatenado à descrição original",
          "Permite alterar tipo entre Corretiva e Preventiva",
          "Disponível apenas enquanto a OS está na etapa Aberta",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato"],
      },
      {
        title: "Legendas por Perfil",
        description: "A tela exibe guias de status personalizados conforme o perfil do usuário logado.",
        details: [
          "Perfis externos (Preposto/Terceirizado): Destaque em Orçamento, Execução e Pagamento",
          "Perfis internos (Gestores/Fiscais): Destaque em Autorização e Ateste",
          "Cores e ícones indicam a ação esperada do usuário em cada status",
        ],
      },
    ],
  },
  {
    id: "agenda",
    title: "Agenda de Visitas",
    icon: CalendarClock,
    color: "text-indigo-600 dark:text-indigo-400",
    description:
      "Calendário de agendamentos de visitas técnicas vinculadas a Ordens de Serviço em execução.",
    features: [
      {
        title: "Calendário Visual",
        description: "Visualização mensal com marcadores de visitas agendadas, realizadas e canceladas.",
        details: [
          "Interface de calendário com navegação mensal",
          "Cores por status: agendada (azul), realizada (verde), cancelada (vermelho)",
          "Clique no dia para ver detalhes dos agendamentos",
        ],
        roles: ["Todos"],
      },
      {
        title: "Agendamento de Visita",
        description: "Criação de visitas técnicas vinculadas a uma OS.",
        details: [
          "Data e hora do agendamento",
          "Responsável técnico pela visita",
          "Descrição da atividade planejada",
          "Campo de observações pós-visita (preenchido após realização)",
        ],
      },
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios",
    icon: FileBarChart,
    color: "text-cyan-600 dark:text-cyan-400",
    description:
      "Módulo de geração e consulta de relatórios de execução e pagamento de Ordens de Serviço.",
    features: [
      {
        title: "Relatórios de Execução",
        description: "Relatórios detalhados de OS com dados operacionais, chamados vinculados e matriz GUT.",
        details: [
          "Geração em PDF com layout profissional",
          "Inclui dados do contrato, empresa, regional e UOP",
          "Seção de chamados vinculados com scores GUT",
          "Envio automático por e-mail para destinatários cadastrados",
          "Histórico de relatórios gerados com data e autor",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional", "Fiscal de Contrato", "Preposto", "Terceirizado"],
      },
      {
        title: "Relatórios de Pagamento",
        description: "Relatórios financeiros de OS encerradas com valores atestados.",
        details: [
          "Valor orçado vs. valor atestado",
          "Dados do contrato e empresa",
          "Documentos de pagamento anexados",
          "Geração em PDF para arquivo e auditoria",
        ],
      },
    ],
  },
  {
    id: "contratos",
    title: "Contratos",
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    description:
      "Gestão de contratos de manutenção vinculados a regionais, com controle de saldo, aditivos e contatos.",
    features: [
      {
        title: "Cadastro de Contrato",
        description: "Registro completo de contratos com dados da empresa, vigência e valores.",
        details: [
          "Número do contrato, empresa, tipo de serviço",
          "Datas de início e fim (vigência)",
          "Valor total do contrato",
          "Objeto contratual e regional vinculada",
          "Dados do preposto: nome, e-mail, telefone",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
      {
        title: "Aditivos Contratuais",
        description: "Registro de termos aditivos que alteram o valor do contrato.",
        details: [
          "Número do aditivo e data",
          "Valor (positivo para acréscimo, negativo para supressão)",
          "Descrição do aditivo",
          "Saldo do contrato recalculado automaticamente: Valor Original + Aditivos − Custos de OS",
        ],
      },
      {
        title: "Contatos do Contrato",
        description: "Cadastro de contatos vinculados ao contrato (fiscais, prepostos, técnicos).",
        details: [
          "Nome, função, e-mail e telefone",
          "Vínculo opcional com usuário do sistema",
          "Múltiplos contatos por contrato",
        ],
      },
      {
        title: "Controle de Saldo",
        description: "O sistema calcula automaticamente o saldo disponível do contrato.",
        details: [
          "Saldo = Valor Total + Aditivos − Custos das OS vinculadas",
          "Alerta visual quando saldo é insuficiente para nova OS",
          "View consolidada (contratos_saldo) disponível no banco",
        ],
      },
    ],
  },
  {
    id: "orcamento",
    title: "Gestão do Orçamento",
    icon: DollarSign,
    color: "text-yellow-600 dark:text-yellow-400",
    description:
      "Módulo financeiro para gestão da dotação orçamentária (LOA), cotas regionais, empenhos e solicitações de crédito suplementar.",
    features: [
      {
        title: "Portaria LOA",
        description: "Registro da Lei Orçamentária Anual com valor total disponível para o exercício.",
        details: [
          "Cadastro por exercício (ano)",
          "Valor total da portaria",
          "Observações e data de criação",
          "Base para distribuição de cotas regionais",
        ],
        roles: ["Gestor Master"],
      },
      {
        title: "Cotas por Regional",
        description: "Distribuição da dotação orçamentária entre as regionais.",
        details: [
          "Valor da cota (dotação) por regional e exercício",
          "Saldo calculado: Dotação + Créditos − Empenhos − Consumo de OS",
          "Alerta quando saldo é insuficiente (bloqueio de autorização)",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
      {
        title: "Créditos Suplementares",
        description: "Registro de créditos adicionais recebidos pela regional.",
        details: [
          "Tipo do crédito, valor, data e número do documento",
          "Descrição e autor do registro",
          "Impacta diretamente o saldo disponível da regional",
        ],
      },
      {
        title: "Empenhos",
        description: "Registro de empenhos realizados pela regional.",
        details: [
          "Número do empenho, valor, data",
          "Descrição e vínculo com o orçamento da regional",
          "Saldo de empenho é verificado na autorização de OS",
        ],
      },
      {
        title: "Solicitações de Crédito",
        description: "Fluxo de solicitação e aprovação de crédito suplementar.",
        details: [
          "Regional solicita acréscimo de cota informando motivo e valor",
          "Inclui dados da OS vinculada, saldo atual do orçamento e contrato",
          "Gestor Master ou Nacional aprova/reprova com resposta e valor aprovado",
          "Status: Pendente → Aprovado/Reprovado",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
    ],
  },
  {
    id: "gestao",
    title: "Gestão do Sistema",
    icon: Shield,
    color: "text-purple-600 dark:text-purple-400",
    description:
      "Módulo administrativo para gerenciamento de usuários, hierarquia organizacional, limites de modalidade e auditoria.",
    features: [
      {
        title: "Gestão de Usuários",
        description: "CRUD completo de usuários com atribuição de perfis e regionais.",
        details: [
          "Cadastro com nome, e-mail, telefone e perfil (role)",
          "Vinculação a uma ou mais regionais",
          "Flag 'Suprido' para agentes de compras",
          "Ativação/desativação de contas",
          "Reset de senha (força troca no próximo login)",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
      {
        title: "Gestão de Regionais",
        description: "Cadastro e manutenção das regionais da PRF.",
        details: [
          "Nome, sigla e UF da regional",
          "Base para toda a segmentação de dados do sistema",
        ],
        roles: ["Gestor Master"],
      },
      {
        title: "Gestão de Delegacias",
        description: "Cadastro de delegacias vinculadas a regionais.",
        details: [
          "Nome e município da delegacia",
          "Vínculo obrigatório com uma regional",
        ],
        roles: ["Gestor Master", "Gestor Nacional"],
      },
      {
        title: "Gestão de UOPs",
        description: "Cadastro de Unidades Operacionais com dados de localização.",
        details: [
          "Nome, endereço, área (m²)",
          "Coordenadas GPS (latitude/longitude)",
          "Vínculo com delegacia (e por herança, com regional)",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
      {
        title: "Limites por Modalidade",
        description: "Configuração dos limites de valor por modalidade de contratação.",
        details: [
          "Limite definido por regional, modalidade e ano",
          "Verificado automaticamente na autorização de OS",
          "Modalidades: Dispensa, Cotação Eletrônica, Pregão, etc.",
        ],
        roles: ["Gestor Master"],
      },
      {
        title: "Logs de Auditoria",
        description: "Registro automático de todas as operações críticas realizadas no sistema.",
        details: [
          "Ação, tabela afetada, registro alterado",
          "Dados anteriores (old_data) e posteriores (new_data) em JSON",
          "Data/hora e identificação do usuário",
          "Filtros por tabela, ação e período",
        ],
        roles: ["Gestor Master", "Gestor Nacional", "Gestor Regional"],
      },
    ],
  },
];

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[role] || ROLE_COLORS["Todos"]}`}>
      {role}
    </span>
  );
}

function FeatureCard({ feature }: { feature: ManualFeature }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-foreground">{feature.title}</h4>
        {feature.roles && (
          <div className="flex flex-wrap gap-1 justify-end">
            {feature.roles.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{feature.description}</p>
      {feature.details && (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {feature.details.map((d, i) => (
            <li key={i} className="flex items-start gap-2">
              <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-primary/60" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
      {feature.tip && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">{feature.tip}</p>
        </div>
      )}
    </div>
  );
}

function SectionNav({ sections, activeSection, onSelect }: { sections: ManualSection[]; activeSection: string; onSelect: (id: string) => void }) {
  return (
    <nav className="space-y-1">
      {sections.map((s) => {
        const Icon = s.icon;
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? s.color : ""}`} />
            <span className="truncate">{s.title}</span>
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
              {s.features.length}
            </Badge>
          </button>
        );
      })}
    </nav>
  );
}

export default function ManualSistema() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const [exporting, setExporting] = useState(false);

  const handleSelect = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const marginL = 18;
      const marginR = 18;
      const contentW = pageW - marginL - marginR;
      const marginTop = 22;
      const marginBottom = 18;
      let y = marginTop;

      // Sanitize text: replace unicode chars jsPDF can't render with safe alternatives
      const safe = (text: string) =>
        text
          .replace(/→/g, "-")
          .replace(/⚠/g, "[!]")
          .replace(/•/g, "-")
          .replace(/×/g, "x")
          .replace(/—/g, "-")
          .replace(/'/g, "'")
          .replace(/"/g, '"')
          .replace(/"/g, '"');

      const checkPage = (needed: number) => {
        if (y + needed > pageH - marginBottom) {
          pdf.addPage();
          y = marginTop;
        }
      };

      const writeLines = (lines: string[], x: number, lineH: number) => {
        lines.forEach((line: string) => {
          checkPage(lineH);
          pdf.text(safe(line), x, y);
          y += lineH;
        });
      };

      // -- Cover page --
      pdf.setFillColor(30, 58, 138);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont("helvetica", "bold");
      pdf.text("Manual do Sistema", pageW / 2, 100, { align: "center" });
      pdf.setFontSize(28);
      pdf.text("SIMP-PRF", pageW / 2, 115, { align: "center" });
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Sistema Integrado de Manutencao Predial", pageW / 2, 135, { align: "center" });
      pdf.text("Policia Rodoviaria Federal", pageW / 2, 143, { align: "center" });
      pdf.setFontSize(10);
      const now = new Date();
      pdf.text(`Gerado em ${now.toLocaleDateString("pt-BR")}`, pageW / 2, 200, { align: "center" });

      // -- Table of Contents --
      pdf.addPage();
      y = marginTop;
      pdf.setTextColor(30, 58, 138);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Indice", marginL, y);
      y += 12;
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      SECTIONS.forEach((section, idx) => {
        checkPage(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(safe(`${idx + 1}. ${section.title}`), marginL + 4, y);
        pdf.setFont("helvetica", "normal");
        y += 7;
        section.features.forEach((f) => {
          checkPage(6);
          pdf.setFontSize(9);
          pdf.text(safe(`  - ${f.title}`), marginL + 12, y);
          pdf.setFontSize(11);
          y += 5;
        });
        y += 3;
      });

      // -- Content pages --
      SECTIONS.forEach((section, sIdx) => {
        pdf.addPage();
        y = marginTop;

        // Section header bar
        pdf.setFillColor(30, 58, 138);
        pdf.rect(marginL, y - 5, contentW, 12, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(safe(`${sIdx + 1}. ${section.title}`), marginL + 4, y + 3);
        y += 14;

        // Section description
        pdf.setTextColor(80, 80, 80);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        const descLines: string[] = pdf.splitTextToSize(safe(section.description), contentW - 8);
        writeLines(descLines, marginL + 4, 4.5);
        y += 4;

        // Features
        section.features.forEach((feature, fIdx) => {
          checkPage(18);

          // Feature title background
          pdf.setFillColor(235, 237, 250);
          pdf.rect(marginL, y - 4, contentW, 8, "F");
          pdf.setTextColor(30, 58, 138);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(safe(`${sIdx + 1}.${fIdx + 1}  ${feature.title}`), marginL + 3, y);
          y += 8;

          // Roles
          if (feature.roles && feature.roles.length > 0) {
            pdf.setFontSize(7.5);
            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(130, 130, 130);
            const rolesText = safe(`Perfis: ${feature.roles.join(", ")}`);
            const rolesLines: string[] = pdf.splitTextToSize(rolesText, contentW - 10);
            writeLines(rolesLines, marginL + 4, 3.5);
            y += 1;
          }

          // Description
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          const fDescLines: string[] = pdf.splitTextToSize(safe(feature.description), contentW - 10);
          writeLines(fDescLines, marginL + 4, 4);
          y += 2;

          // Details
          if (feature.details) {
            feature.details.forEach((detail) => {
              const detailLines: string[] = pdf.splitTextToSize(safe(detail), contentW - 18);
              detailLines.forEach((line: string, li: number) => {
                checkPage(4.5);
                if (li === 0) {
                  pdf.setTextColor(100, 100, 100);
                  pdf.text("-", marginL + 6, y);
                }
                pdf.setTextColor(60, 60, 60);
                pdf.text(line, marginL + 10, y);
                y += 4;
              });
              y += 0.5;
            });
          }

          // Tip
          if (feature.tip) {
            const tipText = safe(`[!] ${feature.tip}`);
            const tipLines: string[] = pdf.splitTextToSize(tipText, contentW - 14);
            const tipH = tipLines.length * 3.8 + 5;
            checkPage(tipH + 2);
            pdf.setFillColor(255, 251, 235);
            pdf.rect(marginL + 2, y - 2, contentW - 4, tipH, "F");
            pdf.setDrawColor(200, 170, 50);
            pdf.rect(marginL + 2, y - 2, contentW - 4, tipH, "S");
            pdf.setTextColor(120, 80, 0);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            tipLines.forEach((line: string) => {
              pdf.text(line, marginL + 5, y + 2);
              y += 3.8;
            });
            y += 5;
          }

          y += 3;
        });
      });

      // -- Footer on every page --
      const totalPages = pdf.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(160, 160, 160);
        pdf.text("SIMP-PRF - Manual do Sistema", marginL, pageH - 8);
        pdf.text(`Pagina ${i - 1} de ${totalPages - 1}`, pageW - marginR, pageH - 8, { align: "right" });
      }

      pdf.save("Manual_SIMP-PRF.pdf");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setExporting(false);
    }
  }, []);

  const currentSection = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Manual do Sistema SIMP-PRF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Documentação completa de todas as funcionalidades, módulos e fluxos do sistema.
          </p>
        </div>
        <Button onClick={exportPDF} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar navigation */}
        <aside className="lg:w-64 shrink-0">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Módulos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <ScrollArea className="max-h-[70vh]">
                <SectionNav sections={SECTIONS} activeSection={activeSection} onSelect={handleSelect} />
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Show all sections on mobile, focused section on desktop */}
          <div className="hidden lg:block">
            <SectionContent section={currentSection} />
          </div>
          <div className="lg:hidden space-y-6">
            {SECTIONS.map((s) => (
              <div key={s.id} id={`section-${s.id}`}>
                <SectionContent section={s} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionContent({ section }: { section: ManualSection }) {
  const Icon = section.icon;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${section.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={section.features.map((_, i) => `${section.id}-${i}`)} className="space-y-2">
          {section.features.map((feature, i) => (
            <AccordionItem key={i} value={`${section.id}-${i}`} className="border rounded-lg px-1">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                {feature.title}
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <FeatureCard feature={feature} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
