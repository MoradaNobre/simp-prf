import jsPDF from "jspdf";
import type { OrdemServico } from "@/hooks/useOrdensServico";

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  triagem: "Triagem",
  orcamento: "Orçamento",
  autorizacao: "Autorização",
  execucao: "Execução",
  ateste: "Ateste",
  pagamento: "Pagamento",
  encerrada: "Encerrada",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

interface ReportData {
  os: OrdemServico;
  contrato?: { numero: string; empresa: string; preposto_nome?: string | null } | null;
  custos?: { descricao: string; tipo: string; valor: number }[];
}

export function generateOSReport({ os, contrato, custos = [] }: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addLine = (label: string, value: string, indent = 14) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, indent, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, indent + doc.getTextWidth(label) + 2, y);
    y += 6;
  };

  const addSection = (title: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
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
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(0);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Identification
  addSection("Identificação");
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
    doc.text(lines, 16, y);
    y += lines.length * 5 + 2;
  }

  // Location
  const uop = os.uops as any;
  const delegacia = uop?.delegacias;
  const regional = (os as any).regionais || delegacia?.regionais;
  if (regional || delegacia || uop) {
    addSection("Localização");
    if (regional) addLine("Regional:", `${regional.nome} (${regional.sigla})`);
    if (delegacia) addLine("Delegacia:", delegacia.nome);
    if (uop) addLine("Unidade:", uop.nome);
  }

  // Contract
  if (contrato) {
    addSection("Contrato");
    addLine("Número:", contrato.numero);
    addLine("Empresa:", contrato.empresa);
    if (contrato.preposto_nome) addLine("Preposto:", contrato.preposto_nome);
  }

  // Dates
  addSection("Datas");
  addLine("Abertura:", new Date(os.data_abertura).toLocaleString("pt-BR"));
  if (os.data_encerramento) {
    addLine("Encerramento:", new Date(os.data_encerramento).toLocaleString("pt-BR"));
  }

  // Budget
  if ((os as any).valor_orcamento > 0) {
    addSection("Orçamento");
    addLine("Valor:", `R$ ${Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    if ((os as any).arquivo_orcamento) {
      addLine("Arquivo:", "Anexado (ver sistema)");
    }
  }

  // Costs
  if (custos.length > 0) {
    addSection("Custos");
    const totalCustos = custos.reduce((sum, c) => sum + Number(c.valor), 0);
    custos.forEach((c) => {
      addLine(`• ${c.descricao} (${c.tipo}):`, `R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    });
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total de Custos: R$ ${totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 16, y);
    y += 6;
  }

  // Payment documents
  const paymentDocs: string[] = (os as any).documentos_pagamento || [];
  if (paymentDocs.length > 0) {
    addSection("Documentos de Pagamento");
    addLine("Quantidade:", `${paymentDocs.length} documento(s) anexado(s)`);
  }

  // Photos
  if (os.foto_antes || os.foto_depois) {
    addSection("Evidências Fotográficas");
    if (os.foto_antes) addLine("Foto Antes:", "Anexada (ver sistema)");
    if (os.foto_depois) addLine("Foto Depois:", "Anexada (ver sistema)");
  }

  // Footer
  y += 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(0);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Documento gerado automaticamente pelo SIMP-PRF", pageWidth / 2, y, { align: "center" });

  doc.save(`Relatorio_${os.codigo}.pdf`);
}
