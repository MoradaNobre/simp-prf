import jsPDF from "jspdf";
import {
  createPdfContext,
  addSection,
  addLine,
  checkPage,
  addPageNumbers,
  addReportFooter,
  statusLabels,
} from "./pdfHelpers";

export interface FaturamentoOSItem {
  codigo: string;
  titulo: string;
  valor_atestado: number;
  valor_orcamento: number;
  data_encerramento: string | null;
  status: string;
}

export interface FaturamentoReportData {
  contrato: {
    numero: string;
    empresa: string;
    data_inicio: string;
    data_fim: string;
    valor_total: number;
    saldo: number;
    valor_total_com_aditivos: number;
  };
  periodo: {
    inicio: string;
    fim: string;
  };
  ordens: FaturamentoOSItem[];
  fiscalNome?: string;
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
};

export function generateFaturamentoReport(data: FaturamentoReportData): jsPDF {
  const ctx = createPdfContext();
  const { doc } = ctx;

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELATÓRIO CONSOLIDADO DE FATURAMENTO", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 7;
  doc.setFontSize(10);
  doc.text(
    `Contrato: ${data.contrato.numero} — ${data.contrato.empresa}`,
    ctx.pageWidth / 2,
    ctx.y,
    { align: "center" }
  );
  ctx.y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Período: ${data.periodo.inicio} a ${data.periodo.fim}`,
    ctx.pageWidth / 2,
    ctx.y,
    { align: "center" }
  );
  ctx.y += 5;
  doc.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ctx.pageWidth / 2,
    ctx.y,
    { align: "center" }
  );
  ctx.y += 10;

  // ── 1. Dados do Contrato ──
  addSection(ctx, "1. Dados do Contrato");
  addLine(ctx, "Número:", data.contrato.numero);
  addLine(ctx, "Empresa:", data.contrato.empresa);
  addLine(ctx, "Vigência:", `${fmtDate(data.contrato.data_inicio)} a ${fmtDate(data.contrato.data_fim)}`);
  addLine(ctx, "Valor Global:", fmt(data.contrato.valor_total));
  addLine(ctx, "Valor c/ Aditivos:", fmt(data.contrato.valor_total_com_aditivos));
  addLine(ctx, "Saldo Disponível:", fmt(data.contrato.saldo));

  // ── 2. Resumo do Período ──
  const totalAtestado = data.ordens.reduce((s, o) => s + (o.valor_atestado || o.valor_orcamento || 0), 0);
  addSection(ctx, "2. Resumo do Período");
  addLine(ctx, "Período:", `${data.periodo.inicio} a ${data.periodo.fim}`);
  addLine(ctx, "Total de OS:", String(data.ordens.length));
  addLine(ctx, "Valor Total Atestado:", fmt(totalAtestado));

  // ── 3. Detalhamento das OS ──
  addSection(ctx, "3. Detalhamento das Ordens de Serviço");

  // Table header
  const colX = [14, 50, 100, 140, 170];
  const colLabels = ["Código", "Título", "Valor Atestado", "Data Ateste", "Status"];

  checkPage(ctx, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setFillColor(230, 230, 230);
  doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 7, "F");
  colLabels.forEach((label, i) => {
    doc.text(label, colX[i], ctx.y);
  });
  ctx.y += 6;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.ordens.forEach((os, idx) => {
    checkPage(ctx, 8);
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, ctx.y - 3.5, ctx.pageWidth - 28, 6, "F");
    }
    doc.text(os.codigo, colX[0], ctx.y);
    // Truncate title to fit
    const maxTitleW = colX[2] - colX[1] - 4;
    const titleLines = doc.splitTextToSize(os.titulo, maxTitleW);
    doc.text(titleLines[0], colX[1], ctx.y);
    doc.text(fmt(os.valor_atestado || os.valor_orcamento || 0), colX[2], ctx.y);
    doc.text(fmtDate(os.data_encerramento), colX[3], ctx.y);
    doc.text(statusLabels[os.status] || os.status, colX[4], ctx.y);
    ctx.y += 6;
  });

  // ── 4. Totalização ──
  ctx.y += 4;
  checkPage(ctx, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setFillColor(220, 235, 250);
  doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 10, "F");
  doc.text(`VALOR TOTAL PARA FATURAMENTO: ${fmt(totalAtestado)}`, 16, ctx.y + 2);
  ctx.y += 14;

  // ── 5. Certificação ──
  addSection(ctx, "5. Certificação");
  const textoAteste = [
    `Certifico que as ${data.ordens.length} Ordens de Serviço listadas acima,`,
    `vinculadas ao Contrato nº ${data.contrato.numero},`,
    `no valor total de ${fmt(totalAtestado)}, foram devidamente atestadas e estão aptas`,
    "para fins de faturamento e pagamento, em conformidade com as condições",
    "contratuais estabelecidas.",
  ].join(" ");

  checkPage(ctx, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const certLines = doc.splitTextToSize(textoAteste, ctx.pageWidth - 32);
  doc.text(certLines, 16, ctx.y);
  ctx.y += certLines.length * 4.5 + 12;

  // Signature
  checkPage(ctx, 30);
  doc.text(new Date().toLocaleDateString("pt-BR"), ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 16;
  doc.line(ctx.pageWidth / 2 - 45, ctx.y, ctx.pageWidth / 2 + 45, ctx.y);
  ctx.y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(data.fiscalNome || "Fiscal Responsável", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Fiscal Titular — Manutenção Predial", ctx.pageWidth / 2, ctx.y, { align: "center" });

  addReportFooter(ctx);
  addPageNumbers(doc);

  return doc;
}

export function downloadFaturamentoReport(data: FaturamentoReportData) {
  const doc = generateFaturamentoReport(data);
  const filename = `Faturamento_${data.contrato.numero.replace(/\//g, "-")}_${data.periodo.inicio.replace(/\//g, "-")}_${data.periodo.fim.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}
