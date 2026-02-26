import jsPDF from "jspdf";

interface ChamadoRef {
  codigo: string;
  gut_score?: number | null;
  tipo_demanda: string;
  local_servico: string;
}

interface ExecucaoReportData {
  codigo: string;
  titulo: string;
  tipo: "corretiva" | "preventiva";
  descricao: string;
  localNome: string;
  regionalNome: string;
  regionalSigla: string;
  solicitanteNome: string;
  valorOrcamento: number;
  contratoNumero?: string;
  contratoEmpresa?: string;
  responsavelExecucaoNome?: string;
  dataAbertura: string;
  dataAutorizacao?: string;
  fiscalNome?: string;
  prioridade?: string;
  chamados?: ChamadoRef[];
}

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export function generateOSExecucaoReport(data: ExecucaoReportData): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 18;

  const checkPage = (needed = 12) => {
    if (y > 280 - needed) {
      doc.addPage();
      y = 20;
    }
  };

  // Header - Institution
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA", pw / 2, y, { align: "center" });
  y += 5;
  doc.text("POLÍCIA RODOVIÁRIA FEDERAL", pw / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`SUPERINTENDÊNCIA DA POLÍCIA RODOVIÁRIA FEDERAL - ${data.regionalSigla}`, pw / 2, y, { align: "center" });
  y += 10;

  // Title
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);
  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`ORDEM DE SERVIÇO - ${data.codigo}`, pw / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(11);
  doc.text("ORDEM DE SERVIÇO PARA MANUTENÇÃO PREDIAL", pw / 2, y, { align: "center" });
  y += 8;
  doc.line(14, y, pw - 14, y);
  y += 10;

  // Local
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Local:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.localNome || "—", 36, y);
  y += 8;

  // Type row
  doc.setFont("helvetica", "bold");
  doc.text("Tipo de Serviço:", 16, y);
  doc.setFont("helvetica", "normal");
  const checkPrev = data.tipo === "preventiva" ? "(X)" : "(  )";
  const checkCorr = data.tipo === "corretiva" ? "(X)" : "(  )";
  doc.text(`${checkPrev} Preventiva    ${checkCorr} Corretiva`, 54, y);
  y += 8;

  // Priority
  if (data.prioridade) {
    doc.setFont("helvetica", "bold");
    doc.text("Prioridade:", 16, y);
    doc.setFont("helvetica", "normal");
    const prioLabel = prioridadeLabels[data.prioridade] || data.prioridade;
    const chamadoOrigin = data.chamados && data.chamados.length > 0;
    const maxGut = chamadoOrigin ? Math.max(...(data.chamados || []).map(c => c.gut_score ?? 0)) : 0;
    const gutNote = chamadoOrigin && maxGut > 0 ? ` (definida por GUT: ${maxGut})` : "";
    doc.text(`${prioLabel}${gutNote}`, 46, y);
    y += 8;
  }

  // OS number and solicitante
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pw - 28, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.text("OS nº:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.codigo, 36, y);
  doc.setFont("helvetica", "bold");
  doc.text("Nome do Solicitante:", pw / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.solicitanteNome, pw / 2 + 52, y);
  y += 16;

  // Chamados vinculados
  if (data.chamados && data.chamados.length > 0) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Chamados Vinculados:", 16, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    data.chamados.forEach((ch, idx) => {
      checkPage(16);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${ch.codigo}`, 20, y);
      doc.setFont("helvetica", "normal");
      const gutStr = ch.gut_score ? ` — GUT: ${ch.gut_score}` : "";
      doc.text(`  ${ch.tipo_demanda} — ${ch.local_servico}${gutStr}`, 20 + doc.getTextWidth(`${idx + 1}. ${ch.codigo}`) + 2, y);
      y += 5;
    });
    y += 3;
    doc.setFontSize(10);
  }

  // Descrição dos Serviços
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Descrição dos Serviços:", 16, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.descricao) {
    const lines = doc.splitTextToSize(data.descricao, pw - 36);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 4;
  } else {
    doc.text("—", 20, y);
    y += 8;
  }

  // Orçamento
  doc.setFont("helvetica", "bold");
  doc.text("Orçamento:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(`R$ ${data.valorOrcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 46, y);
  y += 10;

  // Contrato / Empresa
  if (data.contratoNumero || data.contratoEmpresa) {
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, pw - 28, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Contrato:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.contratoNumero || "—", 42, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Empresa:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.contratoEmpresa || "—", 42, y);
    y += 14;
  }

  // Responsável pela execução
  if (data.responsavelExecucaoNome) {
    doc.setFont("helvetica", "bold");
    doc.text("Responsável pela Execução:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.responsavelExecucaoNome, 72, y);
    y += 8;
  }

  // Datas
  doc.setFont("helvetica", "bold");
  doc.text("Data de Abertura:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.dataAbertura, 56, y);
  y += 6;

  if (data.dataAutorizacao) {
    doc.setFont("helvetica", "bold");
    doc.text("Data de Autorização:", 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.dataAutorizacao, 60, y);
    y += 6;
  }

  // Signature area
  y += 20;
  if (y > 250) {
    doc.addPage();
    y = 30;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${dateStr}`, pw / 2, y, { align: "center" });
  y += 16;

  // Signature line
  doc.line(pw / 2 - 40, y, pw / 2 + 40, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(data.fiscalNome || "Fiscal Responsável", pw / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Manutenção Predial - Fiscal Titular", pw / 2, y, { align: "center" });

  // Footer
  y += 15;
  doc.setDrawColor(180);
  doc.line(14, y, pw - 14, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Documento gerado automaticamente pelo SIMP-PRF — Sistema de Manutenção Predial", pw / 2, y, { align: "center" });

  return doc;
}

export function downloadOSExecucaoReport(data: ExecucaoReportData) {
  const doc = generateOSExecucaoReport(data);
  doc.save(`OS_Execucao_${data.codigo}.pdf`);
}
