import jsPDF from "jspdf";
import { createPdfContext, addPageNumbers, addReportFooter, addLine, addSection, checkPage } from "./pdfHelpers";
import type { ReportData } from "./types";
import { renderIdentificacao } from "./sections/sectionIdentificacao";
import { renderChamados } from "./sections/sectionChamados";
import { renderLocalizacao } from "./sections/sectionLocalizacao";
import { renderContrato } from "./sections/sectionContrato";
import { renderValores, renderCustos } from "./sections/sectionValores";
import { renderResponsaveis } from "./sections/sectionResponsaveis";
import { renderHistorico } from "./sections/sectionHistorico";
import { renderDesvio } from "./sections/sectionDesvio";
import { renderConformidade } from "./sections/sectionConformidade";
import { renderAuditoria } from "./sections/sectionAuditoria";
import { renderAtesteTecnico } from "./sections/sectionAteste";

export type { ReportData } from "./types";

export function generateOSReport(
  data: ReportData,
  { skipSave = false } = {}
): jsPDF {
  const { os, contrato, custos = [], responsaveis = [], valorAtestado, geradoPor, historicoFluxo = [], chamados = [] } = data;

  const ctx = createPdfContext();

  // Header
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(16);
  ctx.doc.text("RELATÓRIO DE ORDEM DE SERVIÇO", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 8;
  ctx.doc.setFontSize(12);
  ctx.doc.text(os.codigo, ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 6;
  ctx.doc.setFontSize(10);
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, ctx.pageWidth / 2, ctx.y, { align: "center" });
  if (geradoPor) {
    ctx.y += 5;
    ctx.doc.text(`Gerado por: ${geradoPor}`, ctx.pageWidth / 2, ctx.y, { align: "center" });
  }
  ctx.y += 4;
  ctx.doc.setDrawColor(0);
  ctx.doc.line(14, ctx.y, ctx.pageWidth - 14, ctx.y);
  ctx.y += 8;

  // Dynamic section numbering
  let sec = 1;
  const hasChamados = chamados.length > 0;

  // 1. Identificação
  renderIdentificacao(ctx, data, sec++);

  // 2. Chamados Vinculados (if any)
  if (hasChamados) {
    renderChamados(ctx, chamados, sec++);
  }

  // 3. Localização
  renderLocalizacao(ctx, os, sec++);

  // 4. Contrato
  if (contrato) {
    renderContrato(ctx, contrato, sec++);
  }

  // 5. Datas
  addSection(ctx, `${sec++}. Datas`);
  addLine(ctx, "Abertura:", new Date(os.data_abertura).toLocaleString("pt-BR"));
  if (os.data_encerramento) {
    addLine(ctx, "Encerramento:", new Date(os.data_encerramento).toLocaleString("pt-BR"));
  }

  // 6. Responsáveis por Etapa
  if (responsaveis.length > 0) {
    renderResponsaveis(ctx, responsaveis, sec++);
  }

  // 7. Valores
  renderValores(ctx, data, sec++);

  // 8. Custos Detalhados
  if (custos.length > 0) {
    renderCustos(ctx, custos, sec++);
  }

  // === NEW PHASE 1 SECTIONS ===

  // 9. Análise de Desvio (Orçado vs. Realizado)
  const valorOrcamento = Number((os as any).valor_orcamento) || 0;
  const totalCustos = data.totalCustos ?? custos.reduce((sum, c) => sum + Number(c.valor), 0);
  if (valorOrcamento > 0 || totalCustos > 0) {
    renderDesvio(ctx, valorOrcamento, totalCustos, sec++);
  }

  // 10. Quadro de Conformidade Contratual
  if (data.contratoSaldo && contrato) {
    renderConformidade(ctx, data.contratoSaldo, valorAtestado || 0, contrato.numero, sec++);
  }

  // 11. Matriz de Responsabilidade Estendida
  if (data.auditoriaTransicoes && data.auditoriaTransicoes.length > 0) {
    renderAuditoria(ctx, data.auditoriaTransicoes, sec++);
  }

  // 12. Documentos de Pagamento
  const paymentDocs: string[] = (os as any).documentos_pagamento || [];
  if (paymentDocs.length > 0) {
    addSection(ctx, `${sec++}. Documentos de Pagamento`);
    addLine(ctx, "Quantidade:", `${paymentDocs.length} documento(s) anexado(s)`);
  }

  // 13. Evidências Fotográficas
  if (os.foto_antes || os.foto_depois) {
    addSection(ctx, `${sec++}. Evidências Fotográficas`);
    if (os.foto_antes) addLine(ctx, "Foto Antes:", "Anexada (ver sistema)");
    if (os.foto_depois) addLine(ctx, "Foto Depois:", "Anexada (ver sistema)");
  }

  // 14. Histórico do Fluxo
  if (historicoFluxo.length > 0) {
    renderHistorico(ctx, historicoFluxo, sec++);
  }

  // 15. Certificação de Ateste Técnico
  if (valorAtestado && valorAtestado > 0) {
    const dataAteste = os.data_encerramento
      ? new Date(os.data_encerramento).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    renderAtesteTecnico(ctx, os.codigo, contrato?.numero, data.fiscalNome, valorAtestado, dataAteste, sec++);
  }

  // Footer
  addReportFooter(ctx);

  // Page numbers on all pages
  addPageNumbers(ctx.doc);

  if (!skipSave) ctx.doc.save(`Relatorio_${os.codigo}.pdf`);
  return ctx.doc;
}
