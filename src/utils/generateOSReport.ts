import jsPDF from "jspdf";
import type { OrdemServico } from "@/hooks/useOrdensServico";

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  orcamento: "Orçamento",
  autorizacao: "Aguardando Autorização",
  execucao: "Execução",
  ateste: "Ateste",
  faturamento: "Faturamento",
  pagamento: "Pagamento",
  encerrada: "Encerrada",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

interface ResponsavelInfo {
  etapa: string;
  nome: string;
  data?: string;
}

interface HistoricoFluxoItem {
  acao: string;
  descricao: string;
  data: string;
  usuario: string;
}

interface ReportData {
  os: OrdemServico;
  contrato?: { numero: string; empresa: string; preposto_nome?: string | null } | null;
  custos?: { descricao: string; tipo: string; valor: number }[];
  responsaveis?: ResponsavelInfo[];
  valorAtestado?: number;
  geradoPor?: string;
  historicoFluxo?: HistoricoFluxoItem[];
}

export function generateOSReport({ os, contrato, custos = [], responsaveis = [], valorAtestado, geradoPor, historicoFluxo = [] }: ReportData, { skipSave = false } = {}): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const checkPage = (needed = 12) => {
    if (y > 280 - needed) {
      doc.addPage();
      y = 20;
    }
  };

  const addLine = (label: string, value: string, indent = 14) => {
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, indent, y);
    doc.setFont("helvetica", "normal");
    const labelWidth = doc.getTextWidth(label) + 2;
    const maxWidth = pageWidth - indent - labelWidth - 14;
    const lines = doc.splitTextToSize(value, maxWidth);
    doc.text(lines, indent + labelWidth, y);
    y += lines.length * 5 + 2;
  };

  const addSection = (title: string) => {
    checkPage(16);
    y += 4;
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, pageWidth - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 16, y + 2);
    y += 12;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RELATÓRIO DE ORDEM DE SERVIÇO", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(12);
  doc.text(os.codigo, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
  if (geradoPor) {
    y += 5;
    doc.text(`Gerado por: ${geradoPor}`, pageWidth / 2, y, { align: "center" });
  }
  y += 4;
  doc.setDrawColor(0);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Identification
  addSection("1. Identificação");
  addLine("Código:", os.codigo);
  addLine("Título:", os.titulo);
  addLine("Status:", statusLabels[os.status] || os.status);
  addLine("Tipo:", os.tipo === "corretiva" ? "Corretiva" : "Preventiva");
  addLine("Prioridade:", prioridadeLabels[os.prioridade] || os.prioridade);

  if (os.descricao) {
    addLine("Descrição:", "");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(os.descricao, pageWidth - 32);
    checkPage(lines.length * 5);
    doc.text(lines, 16, y);
    y += lines.length * 5 + 2;
  }

  // Location
  const uop = os.uops as any;
  const delegacia = uop?.delegacias;
  const regional = (os as any).regionais || delegacia?.regionais;
  if (regional || delegacia || uop) {
    addSection("2. Localização");
    if (regional) addLine("Regional:", `${regional.nome} (${regional.sigla})`);
    if (delegacia) addLine("Delegacia:", delegacia.nome);
    if (uop) addLine("Unidade:", uop.nome);
  }

  // Contract
  if (contrato) {
    addSection("3. Contrato");
    addLine("Número:", contrato.numero);
    addLine("Empresa:", contrato.empresa);
    if (contrato.preposto_nome) addLine("Preposto:", contrato.preposto_nome);
  }

  // Dates
  addSection("4. Datas");
  addLine("Abertura:", new Date(os.data_abertura).toLocaleString("pt-BR"));
  if (os.data_encerramento) {
    addLine("Encerramento:", new Date(os.data_encerramento).toLocaleString("pt-BR"));
  }

  // Responsáveis por etapa
  if (responsaveis.length > 0) {
    addSection("5. Responsáveis por Etapa");
    responsaveis.forEach((r) => {
      const dateStr = r.data ? ` (${r.data})` : "";
      addLine(`${r.etapa}:`, `${r.nome}${dateStr}`);
    });
  }

  // Budget & Attested Value
  addSection("6. Valores");
  if ((os as any).valor_orcamento > 0) {
    addLine("Valor do Orçamento:", `R$ ${Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }
  if (valorAtestado !== undefined && valorAtestado > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    checkPage();
    doc.text(`VALOR GLOBAL ATESTADO: R$ ${valorAtestado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 16, y);
    doc.setFontSize(10);
    y += 8;
  }
  if ((os as any).arquivo_orcamento) {
    addLine("Arquivo de Orçamento:", "Anexado (ver sistema)");
  }

  // Costs
  if (custos.length > 0) {
    addSection("7. Custos Detalhados");
    const totalCustos = custos.reduce((sum, c) => sum + Number(c.valor), 0);
    custos.forEach((c) => {
      addLine(`• ${c.descricao} (${c.tipo}):`, `R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    });
    y += 2;
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total de Custos: R$ ${totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 16, y);
    y += 6;
  }

  // Payment documents
  const paymentDocs: string[] = (os as any).documentos_pagamento || [];
  if (paymentDocs.length > 0) {
    addSection("8. Documentos de Pagamento");
    addLine("Quantidade:", `${paymentDocs.length} documento(s) anexado(s)`);
  }

  // Photos
  if (os.foto_antes || os.foto_depois) {
    addSection("9. Evidências Fotográficas");
    if (os.foto_antes) addLine("Foto Antes:", "Anexada (ver sistema)");
    if (os.foto_depois) addLine("Foto Depois:", "Anexada (ver sistema)");
  }

  // Histórico do Fluxo
  if (historicoFluxo.length > 0) {
    addSection("10. Histórico do Fluxo");
    historicoFluxo.forEach((item, idx) => {
      checkPage(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${idx + 1}. ${item.acao}`, 16, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Data: ${item.data} — Usuário: ${item.usuario}`, 20, y);
      y += 5;
      if (item.descricao) {
        const descLines = doc.splitTextToSize(item.descricao, pageWidth - 40);
        checkPage(descLines.length * 4 + 2);
        doc.text(descLines, 20, y);
        y += descLines.length * 4 + 3;
      }
    });
  }

  // Footer
  y += 10;
  checkPage(20);
  doc.setDrawColor(0);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Documento gerado automaticamente pelo SIMP-PRF — Sistema de Manutenção Predial", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text("Este relatório deve ser juntado ao processo de pagamento no sistema competente.", pageWidth / 2, y, { align: "center" });

  if (!skipSave) doc.save(`Relatorio_${os.codigo}.pdf`);
  return doc;
}
