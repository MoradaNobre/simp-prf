import type { PdfContext } from "../pdfHelpers";
import { addSection, checkPage } from "../pdfHelpers";
import type { HistoricoFluxoItem } from "../types";

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function parseDate(dateStr: string): Date | null {
  // Try ISO first, then pt-BR format "dd/mm/yyyy HH:mm:ss"
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
  if (match) return new Date(+match[3], +match[2] - 1, +match[1], +match[4], +match[5]);
  return null;
}

export function renderHistorico(ctx: PdfContext, historico: HistoricoFluxoItem[], sectionNum: number) {
  if (historico.length === 0) return;

  addSection(ctx, `${sectionNum}. Histórico do Fluxo`);

  historico.forEach((item, idx) => {
    checkPage(ctx, 25);
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(9);
    ctx.doc.text(`${idx + 1}. ${item.acao}`, 16, ctx.y);
    ctx.y += 5;
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);

    // Calculate tempo na etapa
    let tempoStr = "";
    if (idx > 0) {
      const prevDate = parseDate(historico[idx - 1].data);
      const currDate = parseDate(item.data);
      if (prevDate && currDate) {
        const delta = currDate.getTime() - prevDate.getTime();
        if (delta > 0) tempoStr = ` | Tempo na etapa: ${formatDuration(delta)}`;
      }
    }

    ctx.doc.text(`Data: ${item.data} — Usuário: ${item.usuario}${tempoStr}`, 20, ctx.y);
    ctx.y += 5;
    if (item.descricao) {
      const descLines = ctx.doc.splitTextToSize(item.descricao, ctx.pageWidth - 40);
      checkPage(ctx, descLines.length * 4 + 2);
      ctx.doc.text(descLines, 20, ctx.y);
      ctx.y += descLines.length * 4 + 3;
    }
  });
}
