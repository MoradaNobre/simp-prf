import type { PdfContext } from "../pdfHelpers";
import { addSection, checkPage } from "../pdfHelpers";

/**
 * Seção: Análise de Desvio (Orçado vs. Realizado)
 * Compara o valor do orçamento aprovado com os custos reais registrados.
 */
export function renderDesvio(
  ctx: PdfContext,
  valorOrcamento: number,
  totalCustos: number,
  sectionNum: number
) {
  addSection(ctx, `${sectionNum}. Análise de Desvio (Orçado vs. Realizado)`);

  const desvioAbs = totalCustos - valorOrcamento;
  const desvioPerc = valorOrcamento > 0 ? ((desvioAbs / valorOrcamento) * 100) : 0;
  const absDesvioPerc = Math.abs(desvioPerc);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Table header
  const col1 = 16;
  const col2 = 70;
  const col3 = 124;
  const col4 = 162;

  checkPage(ctx, 30);

  // Header row
  ctx.doc.setFillColor(220, 220, 220);
  ctx.doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 7, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.text("Descrição", col1, ctx.y);
  ctx.doc.text("Orçado", col2, ctx.y);
  ctx.doc.text("Realizado", col3, ctx.y);
  ctx.doc.text("Desvio", col4, ctx.y);
  ctx.y += 8;

  // Data row
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(9);
  ctx.doc.text("Valor Total", col1, ctx.y);
  ctx.doc.text(fmt(valorOrcamento), col2, ctx.y);
  ctx.doc.text(fmt(totalCustos), col3, ctx.y);

  // Desvio with color indicator
  const desvioStr = `${desvioAbs >= 0 ? "+" : ""}${fmt(desvioAbs)} (${desvioPerc >= 0 ? "+" : ""}${desvioPerc.toFixed(1)}%)`;
  if (absDesvioPerc > 10) {
    ctx.doc.setTextColor(180, 30, 30);
  } else if (absDesvioPerc > 5) {
    ctx.doc.setTextColor(180, 120, 0);
  }
  ctx.doc.text(desvioStr, col4, ctx.y);
  ctx.doc.setTextColor(0, 0, 0);
  ctx.y += 8;

  // Alert if deviation > 10%
  if (absDesvioPerc > 10) {
    checkPage(ctx, 12);
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(180, 30, 30);
    ctx.doc.text("⚠ ATENÇÃO: Desvio superior a 10% entre valor orçado e realizado.", 16, ctx.y);
    ctx.doc.setTextColor(0, 0, 0);
    ctx.y += 6;
  }
}
