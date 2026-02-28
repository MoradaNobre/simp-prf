import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection } from "../pdfHelpers";
import type { OrdemServico } from "@/hooks/useOrdensServico";

export function renderLocalizacao(ctx: PdfContext, os: OrdemServico, sectionNum: number) {
  const uop = os.uops as any;
  const delegacia = uop?.delegacias;
  const regional = (os as any).regionais || delegacia?.regionais;

  if (!regional && !delegacia && !uop) return;

  addSection(ctx, `${sectionNum}. Localização`);
  if (regional) addLine(ctx, "Regional:", `${regional.nome} (${regional.sigla})`);
  if (delegacia) addLine(ctx, "Delegacia:", delegacia.nome);
  if (uop) addLine(ctx, "Unidade:", uop.nome);
}
