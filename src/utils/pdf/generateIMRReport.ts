import jsPDF from "jspdf";
import {
  addPageNumbers,
  statusLabels,
  prioridadeLabels,
} from "./pdfHelpers";

// ─── Interfaces ───────────────────────────────────────────────────

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

// ─── Visual Law Constants ─────────────────────────────────────────

/** Layout grid */
const ML = 20;           // left margin
const MR = 20;           // right margin
const MT = 22;           // top margin (first page after header)
const MB = 24;           // bottom margin
const ROW_H = 5.5;       // table row height
const SECTION_GAP = 6;   // gap before section
const LINE_H = 5;        // body line height

/** Colors — Visual Law palette (professional, accessible) */
const C = {
  // Primary brand accent (dark navy)
  brand:        [15, 40, 75] as [number, number, number],
  brandLight:   [30, 65, 120] as [number, number, number],
  // Section header
  sectionBg:    [15, 40, 75] as [number, number, number],
  sectionText:  [255, 255, 255] as [number, number, number],
  // Table
  tableHeadBg:  [230, 236, 245] as [number, number, number],
  tableHeadText:[15, 40, 75] as [number, number, number],
  tableAltRow:  [245, 247, 250] as [number, number, number],
  // Highlight panels
  greenBg:      [232, 245, 233] as [number, number, number],
  greenBorder:  [46, 125, 50] as [number, number, number],
  yellowBg:     [255, 249, 230] as [number, number, number],
  yellowBorder: [245, 166, 35] as [number, number, number],
  redBg:        [255, 235, 235] as [number, number, number],
  redBorder:    [198, 40, 40] as [number, number, number],
  orangeBg:     [255, 243, 224] as [number, number, number],
  orangeBorder: [230, 126, 34] as [number, number, number],
  // Text
  textPrimary:  [33, 33, 33] as [number, number, number],
  textSecondary:[100, 100, 100] as [number, number, number],
  textMuted:    [140, 140, 140] as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
  divider:      [200, 210, 220] as [number, number, number],
};

/** Font sizes — strict Visual Law hierarchy */
const FS = {
  title: 15,
  subtitle: 10,
  sectionHead: 10,
  body: 9,
  bodySmall: 8,
  table: 7.5,
  tableHead: 7.5,
  caption: 7,
  footer: 7,
};

// ─── Formatters ───────────────────────────────────────────────────

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

// ─── Drawing primitives ──────────────────────────────────────────

interface Ctx {
  doc: jsPDF;
  y: number;
  pw: number;     // page width
  ph: number;     // page height
  cw: number;     // content width (pw - ML - MR)
}

function newCtx(): Ctx {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  return { doc, y: MT, pw, ph, cw: pw - ML - MR };
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y + needed > ctx.ph - MB) {
    ctx.doc.addPage();
    ctx.y = MT;
  }
}

/** Visual Law: section header with colored band */
function drawSectionHeader(ctx: Ctx, title: string) {
  ensureSpace(ctx, 14);
  ctx.y += SECTION_GAP;
  const h = 8;
  ctx.doc.setFillColor(...C.sectionBg);
  ctx.doc.roundedRect(ML, ctx.y - 1, ctx.cw, h, 1.5, 1.5, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(FS.sectionHead);
  ctx.doc.setTextColor(...C.sectionText);
  ctx.doc.text(title.toUpperCase(), ML + 4, ctx.y + 5);
  ctx.doc.setTextColor(...C.textPrimary);
  ctx.y += h + 4;
}

/** Key-value line with aligned label */
function drawField(ctx: Ctx, label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) {
  ensureSpace(ctx, LINE_H + 1);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(FS.body);
  ctx.doc.setTextColor(...C.textSecondary);
  ctx.doc.text(label, ML + 2, ctx.y);
  const labelW = ctx.doc.getTextWidth(label) + 3;
  ctx.doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  ctx.doc.setTextColor(...(opts?.color ?? C.textPrimary));
  const maxW = ctx.cw - labelW - 4;
  const lines = ctx.doc.splitTextToSize(value, maxW);
  ctx.doc.text(lines, ML + 2 + labelW, ctx.y);
  ctx.doc.setTextColor(...C.textPrimary);
  ctx.y += lines.length * LINE_H;
}

/** Colored info panel (Visual Law highlight box) */
function drawInfoPanel(
  ctx: Ctx,
  items: { label: string; value: string; bold?: boolean }[],
  style: { bg: [number, number, number]; border: [number, number, number] }
) {
  const panelH = items.length * LINE_H + 6;
  ensureSpace(ctx, panelH + 2);
  // Panel background with left accent border
  ctx.doc.setFillColor(...style.bg);
  ctx.doc.roundedRect(ML, ctx.y - 1, ctx.cw, panelH, 1.5, 1.5, "F");
  ctx.doc.setFillColor(...style.border);
  ctx.doc.rect(ML, ctx.y - 1, 2.5, panelH, "F");

  ctx.y += 3;
  items.forEach(item => {
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(FS.body);
    ctx.doc.setTextColor(...C.textSecondary);
    ctx.doc.text(item.label, ML + 6, ctx.y);
    const lw = ctx.doc.getTextWidth(item.label) + 3;
    ctx.doc.setFont("helvetica", item.bold ? "bold" : "normal");
    ctx.doc.setTextColor(...C.textPrimary);
    ctx.doc.text(item.value, ML + 6 + lw, ctx.y);
    ctx.y += LINE_H;
  });
  ctx.y += 2;
}

/** Table with header, zebra rows, and optional total row */
function drawTable(
  ctx: Ctx,
  headers: { label: string; x: number; w: number; align?: "left" | "right" | "center" }[],
  rows: string[][],
  opts?: { totalRow?: string[]; totalBg?: [number, number, number] }
) {
  // Header
  ensureSpace(ctx, 14);
  const headerH = 7;
  ctx.doc.setFillColor(...C.tableHeadBg);
  ctx.doc.roundedRect(ML, ctx.y - 4, ctx.cw, headerH, 1, 1, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(FS.tableHead);
  ctx.doc.setTextColor(...C.tableHeadText);
  headers.forEach(h => {
    const align = h.align ?? "left";
    const xPos = align === "right" ? h.x + h.w : align === "center" ? h.x + h.w / 2 : h.x;
    ctx.doc.text(h.label, xPos, ctx.y, { align });
  });
  ctx.doc.setTextColor(...C.textPrimary);
  ctx.y += headerH - 1;

  // Rows
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(FS.table);
  rows.forEach((row, idx) => {
    ensureSpace(ctx, ROW_H + 1);
    if (idx % 2 === 0) {
      ctx.doc.setFillColor(...C.tableAltRow);
      ctx.doc.rect(ML, ctx.y - 3.5, ctx.cw, ROW_H, "F");
    }
    row.forEach((cell, ci) => {
      const h = headers[ci];
      if (!h) return;
      const lines = ctx.doc.splitTextToSize(cell, h.w - 1);
      const align = h.align ?? "left";
      const xPos = align === "right" ? h.x + h.w : align === "center" ? h.x + h.w / 2 : h.x;
      ctx.doc.text(lines[0] ?? "", xPos, ctx.y, { align });
    });
    ctx.y += ROW_H;
  });

  // Total row
  if (opts?.totalRow) {
    ctx.y += 1;
    ensureSpace(ctx, 8);
    ctx.doc.setFillColor(...(opts.totalBg ?? C.redBg));
    ctx.doc.roundedRect(ML, ctx.y - 4, ctx.cw, 8, 1, 1, "F");
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(FS.bodySmall);
    opts.totalRow.forEach((cell, ci) => {
      const h = headers[ci];
      if (!h) return;
      const align = h.align ?? "left";
      const xPos = align === "right" ? h.x + h.w : align === "center" ? h.x + h.w / 2 : h.x;
      ctx.doc.text(cell, xPos, ctx.y, { align });
    });
    ctx.y += 8;
  }

  ctx.y += 2;
}

/** Draw justified paragraph text */
function drawParagraph(ctx: Ctx, text: string, fontSize = FS.body) {
  ensureSpace(ctx, 12);
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(...C.textPrimary);
  const lines: string[] = ctx.doc.splitTextToSize(text, ctx.cw - 4);
  lines.forEach((line: string, i: number) => {
    ensureSpace(ctx, LINE_H);
    // Justify all lines except the last of each paragraph
    if (i < lines.length - 1 && line.trim().length > 20) {
      drawJustifiedLine(ctx, line, ML + 2, ctx.cw - 4);
    } else {
      ctx.doc.text(line, ML + 2, ctx.y);
    }
    ctx.y += LINE_H - 0.5;
  });
  ctx.y += 2;
}

/** Justify a single line by distributing word spacing */
function drawJustifiedLine(ctx: Ctx, line: string, x: number, maxW: number) {
  const words = line.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 1) {
    ctx.doc.text(line, x, ctx.y);
    return;
  }
  const totalTextW = words.reduce((s, w) => s + ctx.doc.getTextWidth(w), 0);
  const gap = (maxW - totalTextW) / (words.length - 1);
  // Prevent excessive spacing
  if (gap > 8) {
    ctx.doc.text(line, x, ctx.y);
    return;
  }
  let cx = x;
  words.forEach((word, i) => {
    ctx.doc.text(word, cx, ctx.y);
    cx += ctx.doc.getTextWidth(word) + (i < words.length - 1 ? gap : 0);
  });
}

/** Divider line */
function drawDivider(ctx: Ctx) {
  ctx.y += 2;
  ctx.doc.setDrawColor(...C.divider);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ML, ctx.y, ML + ctx.cw, ctx.y);
  ctx.doc.setDrawColor(0);
  ctx.y += 4;
}

/** Custom page footer on every page */
function addIMRFooter(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Top accent line
    doc.setFillColor(...C.brand);
    doc.rect(0, 0, pw, 3, "F");
    // Bottom bar
    doc.setFillColor(...C.brand);
    doc.rect(0, ph - 12, pw, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS.footer);
    doc.setTextColor(...C.white);
    doc.text("SIMP-PRF — Sistema de Manutenção Predial", ML, ph - 5);
    doc.text(`Página ${i}/${totalPages}`, pw - MR, ph - 5, { align: "right" });
    doc.setTextColor(...C.textPrimary);
  }
}

// ─── Situação color helpers ──────────────────────────────────────

function getSituacaoStyle(situacao: string): { bg: [number, number, number]; border: [number, number, number] } {
  const s = situacao.toLowerCase();
  if (s.includes("conforme")) return { bg: C.greenBg, border: C.greenBorder };
  if (s.includes("adversa")) return { bg: C.yellowBg, border: C.yellowBorder };
  if (s.includes("penaliza")) return { bg: C.orangeBg, border: C.orangeBorder };
  return { bg: C.redBg, border: C.redBorder };
}

function getSituacaoTextColor(situacao: string): [number, number, number] {
  const s = situacao.toLowerCase();
  if (s.includes("conforme")) return C.greenBorder;
  if (s.includes("adversa")) return C.yellowBorder;
  if (s.includes("penaliza")) return C.orangeBorder;
  return C.redBorder;
}

// ─── Main Generator ──────────────────────────────────────────────

export function generateIMRReport(data: IMRReportData): jsPDF {
  const ctx = newCtx();
  const { doc } = ctx;

  // ── Cover Header ──
  ctx.y = 18;
  doc.setFillColor(...C.brand);
  doc.roundedRect(ML, ctx.y - 4, ctx.cw, 24, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS.title);
  doc.setTextColor(...C.white);
  doc.text("RELATÓRIO IMR", ML + ctx.cw / 2, ctx.y + 5, { align: "center" });
  doc.setFontSize(FS.body);
  doc.setFont("helvetica", "normal");
  doc.text("INSTRUMENTO DE MEDIÇÃO DE RESULTADO", ML + ctx.cw / 2, ctx.y + 12, { align: "center" });
  doc.setTextColor(...C.textPrimary);
  ctx.y += 28;

  // Sub-header info bar
  doc.setFillColor(...C.tableHeadBg);
  doc.roundedRect(ML, ctx.y, ctx.cw, 14, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS.body);
  doc.setTextColor(...C.brand);
  doc.text(`Contrato nº ${data.contrato.numero}`, ML + 4, ctx.y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.textSecondary);
  doc.text(data.contrato.empresa, ML + 4, ctx.y + 10.5);
  // Right side
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS.bodySmall);
  doc.text(`Período: ${data.periodo.inicio} a ${data.periodo.fim}`, ML + ctx.cw - 4, ctx.y + 5, { align: "right" });
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, ML + ctx.cw - 4, ctx.y + 10.5, { align: "right" });
  doc.setTextColor(...C.textPrimary);
  ctx.y += 20;

  // ── 1. Identificação ──
  drawSectionHeader(ctx, "1. Identificação da Avaliação");
  const idItems: [string, string][] = [
    ["Contrato:", `nº ${data.contrato.numero}`],
    ["Empresa Contratada:", data.contrato.empresa],
    ["Período de Avaliação:", data.periodo.mesAno],
    ["Unidade Avaliada:", data.unidadeAvaliada || "—"],
    ["Fiscal Responsável:", data.fiscalNome],
    ["Data da Avaliação:", data.dataAvaliacao],
  ];
  // Two-column layout for identification
  const colW = ctx.cw / 2 - 2;
  for (let i = 0; i < idItems.length; i += 2) {
    ensureSpace(ctx, LINE_H + 1);
    // Left
    const [lbl1, val1] = idItems[i];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.body);
    doc.setTextColor(...C.textSecondary);
    doc.text(lbl1, ML + 2, ctx.y);
    const lw1 = doc.getTextWidth(lbl1) + 2;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.textPrimary);
    doc.text(doc.splitTextToSize(val1, colW - lw1 - 2)[0] ?? "", ML + 2 + lw1, ctx.y);
    // Right
    if (i + 1 < idItems.length) {
      const [lbl2, val2] = idItems[i + 1];
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.textSecondary);
      doc.text(lbl2, ML + colW + 4, ctx.y);
      const lw2 = doc.getTextWidth(lbl2) + 2;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.textPrimary);
      doc.text(doc.splitTextToSize(val2, colW - lw2 - 2)[0] ?? "", ML + colW + 4 + lw2, ctx.y);
    }
    ctx.y += LINE_H + 1;
  }

  // ── 2. Resumo Executivo — Visual Law highlight panel ──
  drawSectionHeader(ctx, "2. Resumo Executivo do IMR");
  const sitStyle = getSituacaoStyle(data.situacao);
  const sitColor = getSituacaoTextColor(data.situacao);

  // IMR Score large callout
  ensureSpace(ctx, 28);
  const scoreBoxW = 50;
  const detailsX = ML + scoreBoxW + 6;
  // Score box
  doc.setFillColor(...sitStyle.bg);
  doc.roundedRect(ML, ctx.y - 2, scoreBoxW, 24, 2, 2, "F");
  doc.setFillColor(...sitStyle.border);
  doc.rect(ML, ctx.y - 2, 3, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...sitColor);
  doc.text(data.imrScore.toFixed(1), ML + scoreBoxW / 2 + 1, ctx.y + 12, { align: "center" });
  doc.setFontSize(FS.caption);
  doc.setFont("helvetica", "normal");
  doc.text("IMR CALCULADO", ML + scoreBoxW / 2 + 1, ctx.y + 18, { align: "center" });
  // Details to the right
  doc.setTextColor(...C.textPrimary);
  doc.setFontSize(FS.body);
  const detailLines: [string, string][] = [
    ["Meta:", "≥ 9,0"],
    ["Situação:", data.situacao],
    ["Ocorrências:", String(data.totalOcorrencias)],
    ["Pontos perdidos:", data.totalPontosPerdidos.toFixed(1)],
  ];
  let detailY = ctx.y + 1;
  detailLines.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.textSecondary);
    doc.text(lbl, detailsX, detailY);
    const w = doc.getTextWidth(lbl) + 2;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...(lbl === "Situação:" ? sitColor : C.textPrimary));
    doc.text(val, detailsX + w, detailY);
    detailY += LINE_H;
  });
  doc.setTextColor(...C.textPrimary);
  ctx.y += 26;

  // ── 3. Consolidação das OS ──
  drawSectionHeader(ctx, "3. Consolidação das Ordens de Serviço");

  if (data.osConsolidadas.length === 0) {
    ensureSpace(ctx, 8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(FS.body);
    doc.setTextColor(...C.textMuted);
    doc.text("Nenhuma Ordem de Serviço encontrada no período.", ML + 2, ctx.y);
    doc.setTextColor(...C.textPrimary);
    ctx.y += 8;
  } else {
    const osHeaders = [
      { label: "OS", x: ML, w: 28, align: "left" as const },
      { label: "Tipo", x: ML + 28, w: 22, align: "left" as const },
      { label: "Prioridade", x: ML + 50, w: 22, align: "left" as const },
      { label: "Abertura", x: ML + 72, w: 22, align: "center" as const },
      { label: "Encerramento", x: ML + 94, w: 24, align: "center" as const },
      { label: "Valor", x: ML + 118, w: 28, align: "right" as const },
      { label: "Status", x: ML + 146, w: 24, align: "left" as const },
    ];
    const osRows = data.osConsolidadas.map(os => [
      os.codigo,
      os.tipo === "corretiva" ? "Corretiva" : "Preventiva",
      prioridadeLabels[os.prioridade] ?? os.prioridade,
      fmtDate(os.data_abertura),
      fmtDate(os.data_encerramento),
      fmt(os.valor),
      statusLabels[os.status] ?? os.status,
    ]);
    drawTable(ctx, osHeaders, osRows);
  }

  // ── 4. Matriz de Ocorrências ──
  drawSectionHeader(ctx, "4. Matriz de Ocorrências");

  if (data.ocorrencias.length === 0) {
    ensureSpace(ctx, 10);
    drawInfoPanel(ctx, [
      { label: "Resultado:", value: "Nenhuma ocorrência registrada — IMR conforme.", bold: true },
    ], { bg: C.greenBg, border: C.greenBorder });
  } else {
    const ocHeaders = [
      { label: "OS", x: ML, w: 26, align: "left" as const },
      { label: "Tipo de Falha", x: ML + 26, w: 38, align: "left" as const },
      { label: "Regra", x: ML + 64, w: 16, align: "center" as const },
      { label: "Evidência", x: ML + 80, w: 58, align: "left" as const },
      { label: "Qtde", x: ML + 138, w: 14, align: "center" as const },
      { label: "Pontos", x: ML + 152, w: 18, align: "right" as const },
    ];
    const ocRows = data.ocorrencias.map(oc => [
      oc.os_codigo,
      oc.tipo_falha,
      oc.regra_imr,
      oc.evidencia,
      String(oc.quantidade),
      oc.pontos.toFixed(1),
    ]);
    drawTable(ctx, ocHeaders, ocRows, {
      totalRow: ["", "", "", "TOTAL DE PONTOS PERDIDOS", "", data.totalPontosPerdidos.toFixed(1)],
      totalBg: C.redBg,
    });
  }

  // ── 5. Regras Automáticas ──
  drawSectionHeader(ctx, "5. Regras Automáticas de Detecção");
  const regras = [
    ["Item 8/9", "Atraso no prazo de execução", "1,0 – 2,0 pts"],
    ["Item 1", "Valor realizado zero em OS encerrada", "1,0 pt"],
    ["Item 1", "Desvio orçamentário > 10%", "0,5 – 1,0 pt"],
    ["Item 19", "GUT alto (≥ 27) + demora (> 30 dias)", "2,0 pts"],
    ["Item 8", "Prazo de orçamento excedido", "1,0 pt"],
  ];
  const ruleHeaders = [
    { label: "Regra IMR", x: ML, w: 26, align: "left" as const },
    { label: "Descrição", x: ML + 26, w: 108, align: "left" as const },
    { label: "Pontuação", x: ML + 134, w: 36, align: "right" as const },
  ];
  drawTable(ctx, ruleHeaders, regras);

  // ── 6. Cálculo do IMR ──
  drawSectionHeader(ctx, "6. Cálculo do IMR");
  drawInfoPanel(ctx, [
    { label: "Fórmula:", value: "IMR = 10 − Σ(Pontos Perdidos)" },
    { label: "Pontos perdidos:", value: data.totalPontosPerdidos.toFixed(1), bold: true },
    { label: "IMR final:", value: data.imrScore.toFixed(1), bold: true },
  ], sitStyle);

  // ── 7. Impacto Financeiro ──
  drawSectionHeader(ctx, "7. Impacto Financeiro");
  const financStyle = data.percentualRetencao > 0
    ? { bg: C.redBg, border: C.redBorder }
    : { bg: C.greenBg, border: C.greenBorder };
  drawInfoPanel(ctx, [
    { label: "Faixa do IMR:", value: data.situacao, bold: true },
    { label: "Percentual de retenção:", value: `${data.percentualRetencao}%`, bold: true },
    { label: "Valor da fatura:", value: fmt(data.valorFatura) },
    { label: "Valor da glosa/suspensão:", value: fmt(data.valorGlosa), bold: true },
  ], financStyle);

  // ── 8. Análise Qualitativa ──
  drawSectionHeader(ctx, "8. Análise Qualitativa do Fiscal");
  if (data.analiseQualitativa) {
    drawParagraph(ctx, data.analiseQualitativa);
  } else {
    ensureSpace(ctx, 8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(FS.body);
    doc.setTextColor(...C.textMuted);
    doc.text("Sem análise qualitativa registrada.", ML + 2, ctx.y);
    doc.setTextColor(...C.textPrimary);
    ctx.y += 8;
  }

  // ── 9. Contraditório ──
  drawSectionHeader(ctx, "9. Direito ao Contraditório");
  drawField(ctx, "Data de envio à contratada:", data.contraditorio.dataEnvio ? fmtDate(data.contraditorio.dataEnvio) : "—");
  drawField(ctx, "Prazo para manifestação:", "5 dias úteis");
  drawField(ctx, "Situação:", contraditLabels[data.contraditorio.status] ?? data.contraditorio.status);

  // ── 10. Decisão Final ──
  drawSectionHeader(ctx, "10. Decisão Final");
  drawField(ctx, "IMR após reconsideração:", data.decisaoFinal.imrReconsideracao?.toFixed(1) ?? "—");
  drawField(ctx, "Penalidade aplicada:", data.decisaoFinal.penalidade || "—");
  drawField(ctx, "Encaminhamento:", encaminhLabels[data.decisaoFinal.encaminhamento] ?? data.decisaoFinal.encaminhamento);

  // ── 11. Anexos ──
  drawSectionHeader(ctx, "11. Anexos Automáticos");
  const anexos = [
    "Relatórios de OS vinculadas (gerados pelo SIMP)",
    "Evidências fotográficas (registradas nas OS)",
    "Logs do sistema (audit trail completo)",
    "Planilha de cálculo do IMR (dados consolidados acima)",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS.body);
  anexos.forEach((a, i) => {
    ensureSpace(ctx, LINE_H + 1);
    doc.setTextColor(...C.textSecondary);
    doc.text(`${i + 1}.`, ML + 2, ctx.y);
    doc.setTextColor(...C.textPrimary);
    doc.text(a, ML + 8, ctx.y);
    ctx.y += LINE_H;
  });

  // ── Signature Block ──
  ctx.y += 8;
  drawDivider(ctx);
  ensureSpace(ctx, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS.body);
  doc.setTextColor(...C.textSecondary);
  doc.text(data.dataAvaliacao, ctx.pw / 2, ctx.y, { align: "center" });
  ctx.y += 18;
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.5);
  doc.line(ctx.pw / 2 - 45, ctx.y, ctx.pw / 2 + 45, ctx.y);
  doc.setDrawColor(0);
  ctx.y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS.body);
  doc.setTextColor(...C.textPrimary);
  doc.text(data.fiscalNome || "Fiscal Responsável", ctx.pw / 2, ctx.y, { align: "center" });
  ctx.y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS.bodySmall);
  doc.setTextColor(...C.textSecondary);
  doc.text("Fiscal Titular — Manutenção Predial", ctx.pw / 2, ctx.y, { align: "center" });
  doc.setTextColor(...C.textPrimary);

  // ── Footer + page numbers ──
  addIMRFooter(doc);

  return doc;
}

export function downloadIMRReport(data: IMRReportData) {
  const doc = generateIMRReport(data);
  const filename = `IMR_${data.contrato.numero.replace(/\//g, "-")}_${data.periodo.mesAno.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}
