import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection, checkPage, statusLabels, prioridadeLabels } from "../pdfHelpers";
import type { ReportData } from "../types";

export function renderIdentificacao(ctx: PdfContext, data: ReportData, sectionNum: number) {
  const { os, chamados = [] } = data;

  addSection(ctx, `${sectionNum}. Identificação`);
  addLine(ctx, "Código:", os.codigo);
  addLine(ctx, "Título:", os.titulo);
  addLine(ctx, "Status:", statusLabels[os.status] || os.status);
  addLine(ctx, "Tipo:", os.tipo === "corretiva" ? "Corretiva" : "Preventiva");
  addLine(ctx, "Prioridade:", prioridadeLabels[os.prioridade] || os.prioridade);

  if (chamados.length > 0) {
    addLine(ctx, "Origem:", `Criada a partir de ${chamados.length} chamado(s)`);
    const maxGut = Math.max(...chamados.map(c => c.gut_score ?? 0));
    if (maxGut > 0) {
      addLine(ctx, "Score GUT (maior):", `${maxGut} → Prioridade definida automaticamente`);
    }
  } else {
    addLine(ctx, "Origem:", "Criação direta (sem chamado)");
  }

  if (os.descricao) {
    addLine(ctx, "Descrição:", "");
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);
    const lines = ctx.doc.splitTextToSize(os.descricao, ctx.pageWidth - 32);
    checkPage(ctx, lines.length * 5);
    ctx.doc.text(lines, 16, ctx.y);
    ctx.y += lines.length * 5 + 2;
  }
}
