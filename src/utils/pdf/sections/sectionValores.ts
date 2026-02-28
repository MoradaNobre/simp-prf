import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection, checkPage } from "../pdfHelpers";
import type { ReportData } from "../types";

export function renderValores(ctx: PdfContext, data: ReportData, sectionNum: number) {
  addSection(ctx, `${sectionNum}. Valores`);

  if ((data.os as any).valor_orcamento > 0) {
    addLine(ctx, "Valor do Orçamento:", `R$ ${Number((data.os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  }

  if (data.valorAtestado !== undefined && data.valorAtestado > 0) {
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(11);
    checkPage(ctx);
    ctx.doc.text(`VALOR GLOBAL ATESTADO: R$ ${data.valorAtestado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 16, ctx.y);
    ctx.doc.setFontSize(10);
    ctx.y += 8;
  }

  if ((data.os as any).arquivo_orcamento) {
    addLine(ctx, "Arquivo de Orçamento:", "Anexado (ver sistema)");
  }
}

export function renderCustos(ctx: PdfContext, custos: { descricao: string; tipo: string; valor: number }[], sectionNum: number) {
  if (custos.length === 0) return;

  addSection(ctx, `${sectionNum}. Custos Detalhados`);
  const totalCustos = custos.reduce((sum, c) => sum + Number(c.valor), 0);

  custos.forEach((c) => {
    addLine(ctx, `• ${c.descricao} (${c.tipo}):`, `R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  });

  ctx.y += 2;
  checkPage(ctx);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(10);
  ctx.doc.text(`Total de Custos: R$ ${totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 16, ctx.y);
  ctx.y += 6;
}
