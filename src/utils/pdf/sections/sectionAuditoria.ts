import type { PdfContext } from "../pdfHelpers";
import { addSection, checkPage } from "../pdfHelpers";
import type { AuditoriaTransicao } from "../types";

/**
 * Seção: Matriz de Responsabilidade Estendida
 * Tabela detalhada com cada transição de status e responsável.
 * Dados extraídos de audit_logs para rastreabilidade total (RN-049).
 */
export function renderAuditoria(
  ctx: PdfContext,
  transicoes: AuditoriaTransicao[],
  sectionNum: number
) {
  if (transicoes.length === 0) return;

  addSection(ctx, `${sectionNum}. Matriz de Responsabilidade Estendida`);

  const col1 = 16;
  const col2 = 56;
  const col3 = 110;
  const col4 = 158;

  // Header
  checkPage(ctx, 20);
  ctx.doc.setFillColor(220, 220, 220);
  ctx.doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 7, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.text("Etapa", col1, ctx.y);
  ctx.doc.text("Ação", col2, ctx.y);
  ctx.doc.text("Responsável", col3, ctx.y);
  ctx.doc.text("Data/Hora", col4, ctx.y);
  ctx.y += 8;

  // Rows
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(8);

  transicoes.forEach((t, idx) => {
    checkPage(ctx, 8);

    // Zebra striping
    if (idx % 2 === 0) {
      ctx.doc.setFillColor(248, 248, 248);
      ctx.doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 6, "F");
    }

    const maxW1 = 38;
    const maxW2 = 52;
    const maxW3 = 46;
    const maxW4 = 36;

    const etapaTxt = ctx.doc.splitTextToSize(t.etapa, maxW1)[0] || t.etapa;
    const acaoTxt = ctx.doc.splitTextToSize(t.acao, maxW2)[0] || t.acao;
    const usuarioTxt = ctx.doc.splitTextToSize(t.usuario, maxW3)[0] || t.usuario;
    const dataTxt = ctx.doc.splitTextToSize(t.data, maxW4)[0] || t.data;

    ctx.doc.text(etapaTxt, col1, ctx.y);
    ctx.doc.text(acaoTxt, col2, ctx.y);
    ctx.doc.text(usuarioTxt, col3, ctx.y);
    ctx.doc.text(dataTxt, col4, ctx.y);
    ctx.y += 6;
  });

  ctx.y += 2;
}
