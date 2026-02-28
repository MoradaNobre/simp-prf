import type { PdfContext } from "../pdfHelpers";
import { addLine, addSection, checkPage } from "../pdfHelpers";
import type { ContratoSaldoInfo } from "../types";

/**
 * Seção: Quadro de Conformidade Contratual
 * Mostra o consumo percentual do contrato e saldo remanescente.
 */
export function renderConformidade(
  ctx: PdfContext,
  contratoSaldo: ContratoSaldoInfo,
  valorOSAtestado: number,
  contratoNumero: string,
  sectionNum: number
) {
  addSection(ctx, `${sectionNum}. Quadro de Conformidade Contratual`);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const valorComAditivos = contratoSaldo.valorTotal + contratoSaldo.totalAditivos;
  const percConsumo = valorComAditivos > 0
    ? ((contratoSaldo.totalCustos / valorComAditivos) * 100)
    : 0;

  addLine(ctx, "Contrato:", contratoNumero);
  addLine(ctx, "Valor do Contrato:", fmt(contratoSaldo.valorTotal));

  if (contratoSaldo.totalAditivos > 0) {
    addLine(ctx, "Total de Aditivos:", fmt(contratoSaldo.totalAditivos));
    addLine(ctx, "Valor c/ Aditivos:", fmt(valorComAditivos));
  }

  addLine(ctx, "Total Consumido:", fmt(contratoSaldo.totalCustos));
  addLine(ctx, "Saldo Remanescente:", fmt(contratoSaldo.saldo));

  // Barra visual de consumo
  checkPage(ctx, 16);
  ctx.y += 2;
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.text(`Consumo do Contrato: ${percConsumo.toFixed(1)}%`, 16, ctx.y);
  ctx.y += 4;

  // Progress bar
  const barX = 16;
  const barW = ctx.pageWidth - 32;
  const barH = 5;

  ctx.doc.setDrawColor(180, 180, 180);
  ctx.doc.setFillColor(230, 230, 230);
  ctx.doc.rect(barX, ctx.y, barW, barH, "FD");

  const fillW = Math.min((percConsumo / 100) * barW, barW);
  if (percConsumo > 90) {
    ctx.doc.setFillColor(180, 30, 30);
  } else if (percConsumo > 70) {
    ctx.doc.setFillColor(200, 150, 0);
  } else {
    ctx.doc.setFillColor(40, 120, 60);
  }
  ctx.doc.rect(barX, ctx.y, fillW, barH, "F");
  ctx.y += barH + 6;

  // Impacto desta OS
  if (valorOSAtestado > 0 && valorComAditivos > 0) {
    const percOS = (valorOSAtestado / valorComAditivos) * 100;
    addLine(ctx, "Impacto desta OS:", `${percOS.toFixed(2)}% do valor total do contrato`);
  }
}
