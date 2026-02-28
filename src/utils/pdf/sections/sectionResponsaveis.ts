import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection } from "../pdfHelpers";
import type { ResponsavelInfo } from "../types";

export function renderResponsaveis(ctx: PdfContext, responsaveis: ResponsavelInfo[], sectionNum: number) {
  if (responsaveis.length === 0) return;

  addSection(ctx, `${sectionNum}. Responsáveis por Etapa`);
  responsaveis.forEach((r) => {
    const dateStr = r.data ? ` (${r.data})` : "";
    addLine(ctx, `${r.etapa}:`, `${r.nome}${dateStr}`);
  });
}
