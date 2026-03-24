import type { OrdemServico } from "@/hooks/useOrdensServico";

export interface ResponsavelInfo {
  etapa: string;
  nome: string;
  data?: string;
}

export interface HistoricoFluxoItem {
  acao: string;
  descricao: string;
  data: string;
  usuario: string;
}

export interface ChamadoInfo {
  codigo: string;
  tipo_demanda: string;
  local_servico: string;
  descricao: string;
  gut_gravidade?: number | null;
  gut_urgencia?: number | null;
  gut_tendencia?: number | null;
  gut_score?: number | null;
  prioridade: string;
  created_at: string;
  status: string;
  solicitante_nome?: string;
}

export interface ContratoSaldoInfo {
  valorTotal: number;
  totalAditivos: number;
  totalCustos: number;
  saldo: number;
}

export interface AuditoriaTransicao {
  etapa: string;
  usuario: string;
  data: string;
  acao: string;
}

export interface ReportData {
  os: OrdemServico;
  contrato?: { numero: string; empresa: string; preposto_nome?: string | null } | null;
  custos?: { descricao: string; tipo: string; valor: number }[];
  responsaveis?: ResponsavelInfo[];
  valorAtestado?: number;
  geradoPor?: string;
  historicoFluxo?: HistoricoFluxoItem[];
  chamados?: ChamadoInfo[];
  // Phase 1 additions
  totalCustos?: number;
  contratoSaldo?: ContratoSaldoInfo | null;
  fiscalNome?: string;
  auditoriaTransicoes?: AuditoriaTransicao[];
}

export interface ChamadoRef {
  codigo: string;
  gut_score?: number | null;
  tipo_demanda: string;
  local_servico: string;
}

export interface ExecucaoReportData {
  codigo: string;
  titulo: string;
  tipo: "corretiva" | "preventiva";
  descricao: string;
  localNome: string;
  regionalNome: string;
  regionalSigla: string;
  solicitanteNome: string;
  valorOrcamento: number;
  contratoNumero?: string;
  contratoEmpresa?: string;
  responsavelExecucaoNome?: string;
  dataAbertura: string;
  dataAutorizacao?: string;
  prazoExecucao?: string;
  fiscalNome?: string;
  prioridade?: string;
  chamados?: ChamadoRef[];
}
