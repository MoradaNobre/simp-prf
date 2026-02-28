import type { PdfContext } from "../pdfHelpers";
import { addSection, checkPage } from "../pdfHelpers";
import type { HistoricoFluxoItem } from "../types";

export function renderHistorico(ctx: PdfContext, historico: HistoricoFluxoItem[], sectionNum: number) {
  if (historico.length === 0) return;

  addSection(ctx, `${sectionNum}. Histórico do Fluxo`);

  historico.forEach((item, idx) => {
    checkPage(ctx, 20);
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(9);
    ctx.doc.text(`${idx + 1}. ${item.acao}`, 16, ctx.y);
    ctx.y += 5;
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);
    ctx.doc.text(`Data: ${item.data} — Usuário: ${item.usuario}`, 20, ctx.y);
    ctx.y += 5;
    if (item.descricao) {
      const descLines = ctx.doc.splitTextToSize(item.descricao, ctx.pageWidth - 40);
      checkPage(ctx, descLines.length * 4 + 2);
      ctx.doc.text(descLines, 20, ctx.y);
      ctx.y += descLines.length * 4 + 3;
    }
  });
}
