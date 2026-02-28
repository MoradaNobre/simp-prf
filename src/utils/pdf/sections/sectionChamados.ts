import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection, checkPage, prioridadeLabels } from "../pdfHelpers";
import type { ChamadoInfo } from "../types";

export function renderChamados(ctx: PdfContext, chamados: ChamadoInfo[], sectionNum: number) {
  if (chamados.length === 0) return;

  addSection(ctx, `${sectionNum}. Chamados Vinculados`);

  chamados.forEach((ch, idx) => {
    checkPage(ctx, 30);
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(9);
    ctx.doc.text(`${idx + 1}. ${ch.codigo}`, 16, ctx.y);
    ctx.y += 5;
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);

    addLine(ctx, "Tipo Demanda:", ch.tipo_demanda, 20);
    addLine(ctx, "Local:", ch.local_servico, 20);
    addLine(ctx, "Solicitante:", ch.solicitante_nome || "—", 20);
    addLine(ctx, "Data Abertura:", new Date(ch.created_at).toLocaleString("pt-BR"), 20);
    addLine(ctx, "Prioridade:", prioridadeLabels[ch.prioridade] || ch.prioridade, 20);

    if (ch.gut_score != null && ch.gut_score > 0) {
      addLine(ctx, "Matriz GUT:", `G:${ch.gut_gravidade} × U:${ch.gut_urgencia} × T:${ch.gut_tendencia} = ${ch.gut_score}`, 20);
    }

    if (ch.descricao) {
      ctx.doc.setFont("helvetica", "normal");
      ctx.doc.setFontSize(8);
      const descLines = ctx.doc.splitTextToSize(ch.descricao, ctx.pageWidth - 44);
      checkPage(ctx, descLines.length * 4 + 2);
      ctx.doc.text(descLines, 22, ctx.y);
      ctx.y += descLines.length * 4 + 3;
    }
    ctx.y += 2;
  });
}
