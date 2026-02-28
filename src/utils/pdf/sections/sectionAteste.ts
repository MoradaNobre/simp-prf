import type { PdfContext } from "../pdfHelpers";
import { addSection, checkPage } from "../pdfHelpers";

/**
 * Seção: Certificação de Ateste Técnico
 * Texto jurídico padrão de conformidade técnica.
 */
export function renderAtesteTecnico(
  ctx: PdfContext,
  oscodigo: string,
  contratoNumero: string | undefined,
  fiscalNome: string | undefined,
  valorAtestado: number,
  dataAteste: string,
  sectionNum: number
) {
  addSection(ctx, `${sectionNum}. Certificação de Ateste Técnico`);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const textoAteste = [
    `Certifico que os serviços descritos na Ordem de Serviço ${oscodigo}`,
    contratoNumero ? `vinculada ao Contrato nº ${contratoNumero},` : "",
    `no valor de ${fmt(valorAtestado)}, foram executados em conformidade com as`,
    "especificações técnicas contratadas e as condições estabelecidas no instrumento",
    "convocatório. Os materiais empregados e os serviços prestados atendem aos padrões",
    "de qualidade exigidos, tendo sido verificados in loco pelo fiscal responsável.",
    "",
    "Declaro, sob as penas da lei, que os serviços foram integralmente realizados,",
    "podendo o pagamento ser efetuado conforme o valor atestado acima.",
  ].filter(Boolean).join(" ");

  checkPage(ctx, 50);
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(9);
  const lines = ctx.doc.splitTextToSize(textoAteste, ctx.pageWidth - 32);
  ctx.doc.text(lines, 16, ctx.y);
  ctx.y += lines.length * 4.5 + 8;

  // Signature area
  checkPage(ctx, 30);
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(9);
  ctx.doc.text(dataAteste, ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 16;

  ctx.doc.line(ctx.pageWidth / 2 - 45, ctx.y, ctx.pageWidth / 2 + 45, ctx.y);
  ctx.y += 5;
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.text(fiscalNome || "Fiscal Responsável", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(8);
  ctx.doc.text("Fiscal Titular — Manutenção Predial", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 6;
}
