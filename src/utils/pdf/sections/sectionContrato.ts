import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection } from "../pdfHelpers";

export function renderContrato(
  ctx: PdfContext,
  contrato: { numero: string; empresa: string; preposto_nome?: string | null } | null | undefined,
  sectionNum: number
) {
  if (!contrato) return;

  addSection(ctx, `${sectionNum}. Contrato`);
  addLine(ctx, "Número:", contrato.numero);
  addLine(ctx, "Empresa:", contrato.empresa);
  if (contrato.preposto_nome) addLine(ctx, "Preposto:", contrato.preposto_nome);
}
