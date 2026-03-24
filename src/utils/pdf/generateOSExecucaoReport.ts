import jsPDF from "jspdf";
import { createPdfContext, addPageNumbers, checkPage, prioridadeLabels } from "./pdfHelpers";
import type { ExecucaoReportData } from "./types";

export type { ExecucaoReportData } from "./types";

export function generateOSExecucaoReport(data: ExecucaoReportData): jsPDF {
  const ctx = createPdfContext();
  const { doc } = ctx;
  const pw = ctx.pageWidth;
  ctx.y = 18;

  // Header - Institution
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA", pw / 2, ctx.y, { align: "center" });
  ctx.y += 5;
  doc.text("POLÍCIA RODOVIÁRIA FEDERAL", pw / 2, ctx.y, { align: "center" });
  ctx.y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`SUPERINTENDÊNCIA DA POLÍCIA RODOVIÁRIA FEDERAL - ${data.regionalSigla}`, pw / 2, ctx.y, { align: "center" });
  ctx.y += 10;

  // Title
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, ctx.y, pw - 14, ctx.y);
  ctx.y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`ORDEM DE SERVIÇO - ${data.codigo}`, pw / 2, ctx.y, { align: "center" });
  ctx.y += 6;
  doc.setFontSize(11);
  doc.text("ORDEM DE SERVIÇO PARA MANUTENÇÃO PREDIAL", pw / 2, ctx.y, { align: "center" });
  ctx.y += 8;
  doc.line(14, ctx.y, pw - 14, ctx.y);
  ctx.y += 10;

  // Local
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Local:", 16, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.text(data.localNome || "—", 36, ctx.y);
  ctx.y += 8;

  // Type row
  doc.setFont("helvetica", "bold");
  doc.text("Tipo de Serviço:", 16, ctx.y);
  doc.setFont("helvetica", "normal");
  const checkPrev = data.tipo === "preventiva" ? "(X)" : "(  )";
  const checkCorr = data.tipo === "corretiva" ? "(X)" : "(  )";
  doc.text(`${checkPrev} Preventiva    ${checkCorr} Corretiva`, 54, ctx.y);
  ctx.y += 8;

  // Priority
  if (data.prioridade) {
    doc.setFont("helvetica", "bold");
    doc.text("Prioridade:", 16, ctx.y);
    doc.setFont("helvetica", "normal");
    const prioLabel = prioridadeLabels[data.prioridade] || data.prioridade;
    const chamadoOrigin = data.chamados && data.chamados.length > 0;
    const maxGut = chamadoOrigin ? Math.max(...(data.chamados || []).map(c => c.gut_score ?? 0)) : 0;
    const gutNote = chamadoOrigin && maxGut > 0 ? ` (definida por GUT: ${maxGut})` : "";
    doc.text(`${prioLabel}${gutNote}`, 46, ctx.y);
    ctx.y += 8;
  }

  // OS number and solicitante
  doc.setFillColor(240, 240, 240);
  doc.rect(14, ctx.y - 4, pw - 28, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.text("OS nº:", 16, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.text(data.codigo, 36, ctx.y);
  doc.setFont("helvetica", "bold");
  doc.text("Nome do Solicitante:", pw / 2 + 10, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.text(data.solicitanteNome, pw / 2 + 52, ctx.y);
  ctx.y += 16;

  // Chamados vinculados
  if (data.chamados && data.chamados.length > 0) {
    ctx.y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Chamados Vinculados:", 16, ctx.y);
    ctx.y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    data.chamados.forEach((ch, idx) => {
      checkPage(ctx, 16);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${ch.codigo}`, 20, ctx.y);
      doc.setFont("helvetica", "normal");
      const gutStr = ch.gut_score ? ` — GUT: ${ch.gut_score}` : "";
      doc.text(`  ${ch.tipo_demanda} — ${ch.local_servico}${gutStr}`, 20 + doc.getTextWidth(`${idx + 1}. ${ch.codigo}`) + 2, ctx.y);
      ctx.y += 5;
    });
    ctx.y += 3;
    doc.setFontSize(10);
  }

  // Descrição dos Serviços
  ctx.y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Descrição dos Serviços:", 16, ctx.y);
  ctx.y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.descricao) {
    const lines = doc.splitTextToSize(data.descricao, pw - 36);
    doc.text(lines, 20, ctx.y);
    ctx.y += lines.length * 5 + 4;
  } else {
    doc.text("—", 20, ctx.y);
    ctx.y += 8;
  }

  // Orçamento
  doc.setFont("helvetica", "bold");
  doc.text("Orçamento:", 16, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.text(`R$ ${data.valorOrcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 46, ctx.y);
  ctx.y += 10;

  // Contrato / Empresa
  if (data.contratoNumero || data.contratoEmpresa) {
    doc.setFillColor(240, 240, 240);
    doc.rect(14, ctx.y - 4, pw - 28, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Contrato:", 16, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.text(data.contratoNumero || "—", 42, ctx.y);
    ctx.y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Empresa:", 16, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.text(data.contratoEmpresa || "—", 42, ctx.y);
    ctx.y += 14;
  }

  // Responsável pela execução
  if (data.responsavelExecucaoNome) {
    doc.setFont("helvetica", "bold");
    doc.text("Responsável pela Execução:", 16, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.text(data.responsavelExecucaoNome, 72, ctx.y);
    ctx.y += 8;
  }

  // Datas
  doc.setFont("helvetica", "bold");
  doc.text("Data de Abertura:", 16, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.text(data.dataAbertura, 56, ctx.y);
  ctx.y += 6;

  if (data.dataAutorizacao) {
    doc.setFont("helvetica", "bold");
    doc.text("Data de Autorização:", 16, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.text(data.dataAutorizacao, 60, ctx.y);
    ctx.y += 6;
  }

  if (data.prazoExecucao) {
    doc.setFont("helvetica", "bold");
    doc.text("Prazo para Execução:", 16, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.text(data.prazoExecucao, 60, ctx.y);
    ctx.y += 6;
  }

  // Signature area
  ctx.y += 20;
  if (ctx.y > 250) {
    doc.addPage();
    ctx.y = 30;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(dateStr, pw / 2, ctx.y, { align: "center" });
  ctx.y += 16;

  doc.line(pw / 2 - 40, ctx.y, pw / 2 + 40, ctx.y);
  ctx.y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(data.fiscalNome || "Fiscal Responsável", pw / 2, ctx.y, { align: "center" });
  ctx.y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Manutenção Predial - Fiscal Titular", pw / 2, ctx.y, { align: "center" });

  // Footer
  ctx.y += 15;
  doc.setDrawColor(180);
  doc.line(14, ctx.y, pw - 14, ctx.y);
  ctx.y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Documento gerado automaticamente pelo SIMP-PRF — Sistema de Manutenção Predial", pw / 2, ctx.y, { align: "center" });

  // Page numbers
  addPageNumbers(doc);

  return doc;
}

export function downloadOSExecucaoReport(data: ExecucaoReportData) {
  const doc = generateOSExecucaoReport(data);
  doc.save(`OS_Execucao_${data.codigo}.pdf`);
}
