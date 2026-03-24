import jsPDF from "jspdf";
import {
  createPdfContext,
  addSection,
  addLine,
  checkPage,
  addPageNumbers,
  addReportFooter,
  statusLabels,
  prioridadeLabels,
} from "./pdfHelpers";

export interface IMROcorrencia {
  os_codigo: string;
  tipo_falha: string;
  regra_imr: string;
  evidencia: string;
  quantidade: number;
  pontos: number;
  automatica: boolean;
}

export interface IMROSConsolidada {
  codigo: string;
  tipo: string;
  prioridade: string;
  data_abertura: string;
  data_encerramento: string | null;
  valor: number;
  status: string;
}

export interface IMRReportData {
  contrato: { numero: string; empresa: string };
  periodo: { inicio: string; fim: string; mesAno: string };
  fiscalNome: string;
  dataAvaliacao: string;
  unidadeAvaliada: string;
  imrScore: number;
  situacao: string;
  totalOcorrencias: number;
  totalPontosPerdidos: number;
  osConsolidadas: IMROSConsolidada[];
  ocorrencias: IMROcorrencia[];
  valorFatura: number;
  percentualRetencao: number;
  valorGlosa: number;
  analiseQualitativa: string;
  contraditorio: { dataEnvio: string; status: string };
  decisaoFinal: {
    imrReconsideracao?: number;
    penalidade: string;
    encaminhamento: string;
  };
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
};

const contraditLabels: Record<string, string> = {
  sem_manifestacao: "Sem manifestação",
  em_analise: "Em análise",
  acatada: "Acatada",
  indeferida: "Indeferida",
};

const encaminhLabels: Record<string, string> = {
  arquivamento: "Arquivamento",
  glosa: "Glosa",
  processo_sancionador: "Abertura de processo sancionador",
};

function drawTableRow(ctx: ReturnType<typeof createPdfContext>, cols: { x: number; text: string; width?: number }[], bold = false) {
  checkPage(ctx, 7);
  ctx.doc.setFont("helvetica", bold ? "bold" : "normal");
  ctx.doc.setFontSize(8);
  cols.forEach(col => {
    const lines = ctx.doc.splitTextToSize(col.text, col.width ?? 30);
    ctx.doc.text(lines[0] ?? "", col.x, ctx.y);
  });
  ctx.y += 5;
}

export function generateIMRReport(data: IMRReportData): jsPDF {
  const ctx = createPdfContext();
  const { doc } = ctx;

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELATÓRIO IMR — INSTRUMENTO DE MEDIÇÃO DE RESULTADO", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 7;
  doc.setFontSize(10);
  doc.text(`Contrato: ${data.contrato.numero} — ${data.contrato.empresa}`, ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Período: ${data.periodo.inicio} a ${data.periodo.fim}`, ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 5;
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 10;

  // ── 1. Identificação ──
  addSection(ctx, "1. Identificação da Avaliação");
  addLine(ctx, "Contrato:", `nº ${data.contrato.numero}`);
  addLine(ctx, "Empresa Contratada:", data.contrato.empresa);
  addLine(ctx, "Período de Avaliação:", data.periodo.mesAno);
  addLine(ctx, "Unidade Avaliada:", data.unidadeAvaliada || "—");
  addLine(ctx, "Fiscal Responsável:", data.fiscalNome);
  addLine(ctx, "Data da Avaliação:", data.dataAvaliacao);

  // ── 2. Resumo Executivo ──
  addSection(ctx, "2. Resumo Executivo do IMR");
  addLine(ctx, "IMR Calculado:", data.imrScore.toFixed(1));
  addLine(ctx, "Meta:", "≥ 9,0");
  addLine(ctx, "Situação:", data.situacao);
  addLine(ctx, "Total de Ocorrências:", String(data.totalOcorrencias));
  addLine(ctx, "Total de Pontos Perdidos:", data.totalPontosPerdidos.toFixed(1));

  // ── 3. Consolidação das OS ──
  addSection(ctx, "3. Consolidação das OS do Período");

  const osColX = [14, 48, 73, 93, 123, 153, 178];
  const osColLabels = ["OS", "Tipo", "Prioridade", "Abertura", "Encerramento", "Valor", "Status"];

  checkPage(ctx, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setFillColor(230, 230, 230);
  doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 7, "F");
  osColLabels.forEach((label, i) => doc.text(label, osColX[i], ctx.y));
  ctx.y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  data.osConsolidadas.forEach((os, idx) => {
    checkPage(ctx, 7);
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, ctx.y - 3.5, ctx.pageWidth - 28, 5.5, "F");
    }
    doc.text(os.codigo, osColX[0], ctx.y);
    doc.text(os.tipo === "corretiva" ? "Corretiva" : "Preventiva", osColX[1], ctx.y);
    doc.text(prioridadeLabels[os.prioridade] ?? os.prioridade, osColX[2], ctx.y);
    doc.text(fmtDate(os.data_abertura), osColX[3], ctx.y);
    doc.text(fmtDate(os.data_encerramento), osColX[4], ctx.y);
    doc.text(fmt(os.valor), osColX[5], ctx.y);
    doc.text(statusLabels[os.status] ?? os.status, osColX[6], ctx.y);
    ctx.y += 5.5;
  });
  ctx.y += 2;

  // ── 4. Matriz de Ocorrências ──
  addSection(ctx, "4. Matriz de Ocorrências");

  if (data.ocorrencias.length === 0) {
    checkPage(ctx, 8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Nenhuma ocorrência registrada — IMR conforme.", 16, ctx.y);
    ctx.y += 8;
  } else {
    const ocColX = [14, 44, 84, 104, 154, 172];
    const ocColLabels = ["OS", "Tipo de Falha", "Regra IMR", "Evidência", "Qtde", "Pontos"];

    checkPage(ctx, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setFillColor(230, 230, 230);
    doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 7, "F");
    ocColLabels.forEach((label, i) => doc.text(label, ocColX[i], ctx.y));
    ctx.y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    data.ocorrencias.forEach((oc, idx) => {
      checkPage(ctx, 7);
      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(14, ctx.y - 3.5, ctx.pageWidth - 28, 5.5, "F");
      }
      doc.text(oc.os_codigo, ocColX[0], ctx.y);
      const tipoLines = doc.splitTextToSize(oc.tipo_falha, 38);
      doc.text(tipoLines[0], ocColX[1], ctx.y);
      doc.text(oc.regra_imr, ocColX[2], ctx.y);
      const evLines = doc.splitTextToSize(oc.evidencia, 46);
      doc.text(evLines[0], ocColX[3], ctx.y);
      doc.text(String(oc.quantidade), ocColX[4], ctx.y);
      doc.text(oc.pontos.toFixed(1), ocColX[5], ctx.y);
      ctx.y += 5.5;
    });

    // Total row
    ctx.y += 2;
    checkPage(ctx, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(255, 235, 235);
    doc.rect(14, ctx.y - 4, ctx.pageWidth - 28, 8, "F");
    doc.text("TOTAL DE PONTOS PERDIDOS:", 104, ctx.y);
    doc.text(data.totalPontosPerdidos.toFixed(1), ocColX[5], ctx.y);
    ctx.y += 10;
  }

  // ── 5. Regras de Detecção ──
  addSection(ctx, "5. Regras Automáticas de Detecção Aplicadas");
  const regras = [
    "• Atraso no prazo de execução → Item 8/9 (1.0-2.0 pts)",
    "• Valor realizado zero em OS encerrada → Item 1 (1.0 pt)",
    "• Desvio orçamentário > 10% → Item 1 (0.5-1.0 pt)",
    "• GUT alto (≥27) + demora (>30 dias) → Item 19 (2.0 pts)",
    "• Prazo de orçamento excedido → Item 8 (1.0 pt)",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  regras.forEach(r => {
    checkPage(ctx, 6);
    doc.text(r, 16, ctx.y);
    ctx.y += 5;
  });
  ctx.y += 2;

  // ── 6. Cálculo ──
  addSection(ctx, "6. Cálculo do IMR");
  addLine(ctx, "Fórmula:", "IMR = 10 - Σ(Pontos Perdidos)");
  addLine(ctx, "Pontos perdidos:", data.totalPontosPerdidos.toFixed(1));
  addLine(ctx, "IMR final:", data.imrScore.toFixed(1));

  // ── 7. Impacto Financeiro ──
  addSection(ctx, "7. Impacto Financeiro");
  addLine(ctx, "Faixa do IMR:", data.situacao);
  addLine(ctx, "Percentual de retenção:", `${data.percentualRetencao}%`);
  addLine(ctx, "Valor da fatura:", fmt(data.valorFatura));
  addLine(ctx, "Valor da glosa/suspensão:", fmt(data.valorGlosa));

  // ── 8. Análise Qualitativa ──
  addSection(ctx, "8. Análise Qualitativa do Fiscal");
  if (data.analiseQualitativa) {
    checkPage(ctx, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.analiseQualitativa, ctx.pageWidth - 32);
    doc.text(lines, 16, ctx.y);
    ctx.y += lines.length * 4.5 + 4;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Sem análise qualitativa registrada.", 16, ctx.y);
    ctx.y += 8;
  }

  // ── 9. Contraditório ──
  addSection(ctx, "9. Direito ao Contraditório");
  addLine(ctx, "Data de envio à contratada:", data.contraditorio.dataEnvio ? fmtDate(data.contraditorio.dataEnvio) : "—");
  addLine(ctx, "Prazo para manifestação:", "5 dias úteis");
  addLine(ctx, "Situação:", contraditLabels[data.contraditorio.status] ?? data.contraditorio.status);

  // ── 10. Decisão Final ──
  addSection(ctx, "10. Decisão Final");
  addLine(ctx, "IMR após reconsideração:", data.decisaoFinal.imrReconsideracao?.toFixed(1) ?? "—");
  addLine(ctx, "Penalidade aplicada:", data.decisaoFinal.penalidade || "—");
  addLine(ctx, "Encaminhamento:", encaminhLabels[data.decisaoFinal.encaminhamento] ?? data.decisaoFinal.encaminhamento);

  // ── 11. Anexos ──
  addSection(ctx, "11. Anexos Automáticos");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const anexos = [
    "• Relatórios de OS vinculadas (gerados pelo SIMP)",
    "• Evidências fotográficas (registradas nas OS)",
    "• Logs do sistema (audit trail completo)",
    "• Planilha de cálculo do IMR (dados consolidados acima)",
  ];
  anexos.forEach(a => {
    checkPage(ctx, 6);
    doc.text(a, 16, ctx.y);
    ctx.y += 5;
  });

  // ── Signature ──
  ctx.y += 10;
  checkPage(ctx, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.dataAvaliacao, ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 16;
  doc.line(ctx.pageWidth / 2 - 45, ctx.y, ctx.pageWidth / 2 + 45, ctx.y);
  ctx.y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(data.fiscalNome || "Fiscal Responsável", ctx.pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Fiscal Titular — Manutenção Predial", ctx.pageWidth / 2, ctx.y, { align: "center" });

  addReportFooter(ctx);
  addPageNumbers(doc);

  return doc;
}

export function downloadIMRReport(data: IMRReportData) {
  const doc = generateIMRReport(data);
  const filename = `IMR_${data.contrato.numero.replace(/\//g, "-")}_${data.periodo.mesAno.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}
