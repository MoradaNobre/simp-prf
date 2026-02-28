import jsPDF from "jspdf";

export interface PdfContext {
  doc: jsPDF;
  y: number;
  pageWidth: number;
}

export function createPdfContext(): PdfContext {
  const doc = new jsPDF();
  return {
    doc,
    y: 20,
    pageWidth: doc.internal.pageSize.getWidth(),
  };
}

export function checkPage(ctx: PdfContext, needed = 12) {
  if (ctx.y > 280 - needed) {
    ctx.doc.addPage();
    ctx.y = 20;
  }
}

export function addLine(ctx: PdfContext, label: string, value: string, indent = 14) {
  checkPage(ctx);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(10);
  ctx.doc.text(label, indent, ctx.y);
  ctx.doc.setFont("helvetica", "normal");
  const labelWidth = ctx.doc.getTextWidth(label) + 2;
  const maxWidth = ctx.pageWidth - indent - labelWidth - 14;
  const lines = ctx.doc.splitTextToSize(value, maxWidth);
  ctx.doc.text(lines, indent + labelWidth, ctx.y);
  ctx.y += lines.length * 5 + 2;
}

export function addSection(ctx: PdfContext, title: string) {
  checkPage(ctx, 16);
  ctx.y += 4;
  ctx.doc.setFillColor(240, 240, 240);
  ctx.doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 8, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(11);
  ctx.doc.text(title, 16, ctx.y + 2);
  ctx.y += 12;
}

export function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: "center" });
  }
  doc.setTextColor(0, 0, 0);
}

export function addReportFooter(ctx: PdfContext) {
  ctx.y += 10;
  checkPage(ctx, 20);
  ctx.doc.setDrawColor(0);
  ctx.doc.line(14, ctx.y, ctx.pageWidth - 14, ctx.y);
  ctx.y += 8;
  ctx.doc.setFont("helvetica", "italic");
  ctx.doc.setFontSize(8);
  ctx.doc.text(
    "Documento gerado automaticamente pelo SIMP-PRF — Sistema de Manutenção Predial",
    ctx.pageWidth / 2, ctx.y, { align: "center" }
  );
  ctx.y += 4;
  ctx.doc.text(
    "Este relatório deve ser juntado ao processo de pagamento no sistema competente.",
    ctx.pageWidth / 2, ctx.y, { align: "center" }
  );
}

export const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  orcamento: "Orçamento",
  autorizacao: "Aguardando Autorização",
  execucao: "Execução",
  ateste: "Ateste",
  faturamento: "Faturamento",
  pagamento: "Pagamento",
  encerrada: "Encerrada",
};

export const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};
