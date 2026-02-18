import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

interface ContratoData {
  id: string;
  numero: string;
  empresa: string;
  objeto: string | null;
  tipo_servico: string;
  valor_total: number;
  data_inicio: string;
  data_fim: string;
  status: string;
  preposto_nome: string | null;
  preposto_email: string | null;
  preposto_telefone: string | null;
  regional_sigla?: string;
  regional_nome?: string;
}

interface ContratoContato {
  nome: string;
  funcao: string | null;
  email: string | null;
  telefone: string | null;
}

interface OSResumo {
  codigo: string;
  titulo: string;
  status: string;
  prioridade: string;
  tipo: string;
  data_abertura: string;
  data_encerramento: string | null;
  valor_orcamento: number | null;
}

const TIPO_LABELS: Record<string, string> = {
  manutencao_predial: "Manutenção Predial",
  manutencao_ar_condicionado: "Ar Condicionado",
};

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  orcamento: "Orçamento",
  autorizacao: "Aguard. Autorização",
  execucao: "Execução",
  ateste: "Ateste",
  pagamento: "Pagamento",
  encerrada: "Encerrada",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function generateContratoReport(contrato: ContratoData) {
  // Fetch related data
  const [contatosRes, osRes, custosRes] = await Promise.all([
    supabase
      .from("contrato_contatos")
      .select("nome, funcao, email, telefone")
      .eq("contrato_id", contrato.id)
      .order("created_at"),
    supabase
      .from("ordens_servico")
      .select("codigo, titulo, status, prioridade, tipo, data_abertura, data_encerramento, valor_orcamento")
      .eq("contrato_id", contrato.id)
      .order("data_abertura", { ascending: false }),
    supabase
      .from("os_custos")
      .select("os_id, valor, descricao, tipo")
      .in(
        "os_id",
        (
          await supabase
            .from("ordens_servico")
            .select("id")
            .eq("contrato_id", contrato.id)
        ).data?.map((o) => o.id) ?? []
      ),
  ]);

  const contatos: ContratoContato[] = contatosRes.data ?? [];
  const ordens: OSResumo[] = osRes.data ?? [];
  const custos = custosRes.data ?? [];

  // Group OS by year
  const osByYear: Record<number, OSResumo[]> = {};
  ordens.forEach((os) => {
    const year = new Date(os.data_abertura).getFullYear();
    if (!osByYear[year]) osByYear[year] = [];
    osByYear[year].push(os);
  });
  const years = Object.keys(osByYear)
    .map(Number)
    .sort((a, b) => b - a);

  // Compute cost per OS
  const custosPorOS: Record<string, number> = {};
  custos.forEach((c: any) => {
    custosPorOS[c.os_id] = (custosPorOS[c.os_id] ?? 0) + Number(c.valor);
  });

  // Totals
  const totalCustos = custos.reduce((s: number, c: any) => s + Number(c.valor), 0);
  const saldo = contrato.valor_total - totalCustos;

  // === PDF generation ===
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 18;

  const checkPage = (needed = 12) => {
    if (y > 280 - needed) {
      doc.addPage();
      y = 18;
    }
  };

  const addLine = (label: string, value: string, indent = 14) => {
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, indent, y);
    doc.setFont("helvetica", "normal");
    const lw = doc.getTextWidth(label) + 4;
    const maxW = pw - indent - lw - 14;
    const lines = doc.splitTextToSize(value || "—", maxW > 20 ? maxW : 60);
    doc.text(lines, indent + lw, y);
    y += lines.length * 4.5 + 2;
  };

  const addSection = (title: string) => {
    checkPage(16);
    y += 3;
    doc.setFillColor(20, 55, 100);
    doc.rect(14, y - 4, pw - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 16, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("RELATÓRIO DETALHADO DE CONTRATO", pw / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.text(contrato.numero, pw / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pw / 2, y, {
    align: "center",
  });
  y += 3;
  doc.setDrawColor(20, 55, 100);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);
  y += 8;

  // ---- 1. Dados do Contrato ----
  addSection("1. Dados do Contrato");
  addLine("Número:", contrato.numero);
  addLine("Empresa:", contrato.empresa);
  if (contrato.objeto) addLine("Objeto:", contrato.objeto);
  addLine("Tipo de Serviço:", TIPO_LABELS[contrato.tipo_servico] ?? contrato.tipo_servico);
  addLine("Regional:", contrato.regional_nome ? `${contrato.regional_nome} (${contrato.regional_sigla})` : "—");
  addLine(
    "Vigência:",
    `${new Date(contrato.data_inicio).toLocaleDateString("pt-BR")} a ${new Date(contrato.data_fim).toLocaleDateString("pt-BR")}`
  );
  const hoje = new Date();
  const vigente =
    hoje >= new Date(contrato.data_inicio) && hoje <= new Date(contrato.data_fim);
  addLine("Situação:", vigente ? "Vigente" : "Encerrado");

  // ---- 2. Valores ----
  addSection("2. Resumo Financeiro");
  addLine("Valor Global:", fmt(contrato.valor_total));
  addLine("Total Executado:", fmt(totalCustos));
  addLine(
    "Saldo Disponível:",
    fmt(saldo)
  );
  const pctUsado =
    contrato.valor_total > 0
      ? Math.round((totalCustos / contrato.valor_total) * 100)
      : 0;
  addLine("Percentual Utilizado:", `${pctUsado}%`);

  // ---- 3. Preposto e Contatos ----
  addSection("3. Preposto e Contatos da Empresa");
  if (contrato.preposto_nome) {
    addLine("Preposto:", contrato.preposto_nome);
    if (contrato.preposto_email) addLine("  E-mail:", contrato.preposto_email);
    if (contrato.preposto_telefone)
      addLine("  Telefone:", contrato.preposto_telefone);
  } else {
    addLine("Preposto:", "Não definido");
  }

  if (contatos.length > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    checkPage();
    doc.text("Contatos vinculados:", 14, y);
    y += 5;
    contatos.forEach((ct, i) => {
      checkPage(15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${i + 1}. ${ct.nome}${ct.funcao ? ` — ${ct.funcao}` : ""}`, 18, y);
      y += 4;
      if (ct.email) {
        doc.text(`   E-mail: ${ct.email}`, 18, y);
        y += 4;
      }
      if (ct.telefone) {
        doc.text(`   Telefone: ${ct.telefone}`, 18, y);
        y += 4;
      }
      y += 1;
    });
  }

  // ---- 4. Resumo de OS por Ano ----
  addSection("4. Ordens de Serviço por Ano");

  if (ordens.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Nenhuma Ordem de Serviço vinculada a este contrato.", 16, y);
    y += 6;
  } else {
    addLine("Total de OS:", `${ordens.length}`);
    const osEncerradas = ordens.filter((o) => o.status === "encerrada").length;
    const osAbertas = ordens.filter((o) => o.status !== "encerrada").length;
    addLine("Encerradas:", `${osEncerradas}`);
    addLine("Em andamento:", `${osAbertas}`);
    y += 4;

    years.forEach((year) => {
      const list = osByYear[year];
      const totalAno = list.reduce(
        (s, o) => s + (custosPorOS[(o as any).id] ?? Number(o.valor_orcamento ?? 0)),
        0
      );

      checkPage(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pw - 28, 7, "F");
      doc.text(`${year}  —  ${list.length} OS  —  ${fmt(totalAno)}`, 16, y + 1);
      y += 10;

      // Table header
      checkPage(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setFillColor(230, 230, 230);
      doc.rect(14, y - 3.5, pw - 28, 5, "F");
      doc.text("Código", 16, y);
      doc.text("Título", 42, y);
      doc.text("Tipo", 110, y);
      doc.text("Status", 132, y);
      doc.text("Valor", 162, y);
      doc.text("Data", 182, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      list.forEach((os) => {
        checkPage(6);
        doc.text(os.codigo, 16, y);
        const tituloTrunc =
          os.titulo.length > 35 ? os.titulo.substring(0, 35) + "…" : os.titulo;
        doc.text(tituloTrunc, 42, y);
        doc.text(os.tipo === "corretiva" ? "Corr." : "Prev.", 110, y);
        doc.text(statusLabels[os.status] ?? os.status, 132, y);
        const osVal = custosPorOS[(os as any).id] ?? Number(os.valor_orcamento ?? 0);
        doc.text(osVal > 0 ? fmt(osVal) : "—", 162, y);
        doc.text(
          new Date(os.data_abertura).toLocaleDateString("pt-BR"),
          182,
          y
        );
        y += 5;
      });
      y += 4;
    });
  }

  // ---- 5. Resumo por Status ----
  addSection("5. Distribuição por Status");
  const statusCount: Record<string, number> = {};
  ordens.forEach((os) => {
    statusCount[os.status] = (statusCount[os.status] ?? 0) + 1;
  });
  Object.entries(statusCount).forEach(([status, count]) => {
    addLine(`${statusLabels[status] ?? status}:`, `${count} OS`);
  });

  // ---- 6. Resumo por Prioridade ----
  if (ordens.length > 0) {
    addSection("6. Distribuição por Prioridade");
    const prioCount: Record<string, number> = {};
    ordens.forEach((os) => {
      prioCount[os.prioridade] = (prioCount[os.prioridade] ?? 0) + 1;
    });
    Object.entries(prioCount).forEach(([prio, count]) => {
      addLine(`${prioridadeLabels[prio] ?? prio}:`, `${count} OS`);
    });
  }

  // ---- Footer ----
  y += 8;
  checkPage(16);
  doc.setDrawColor(20, 55, 100);
  doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y);
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    "Documento gerado automaticamente pelo SIMP-PRF — Sistema de Manutenção Predial",
    pw / 2,
    y,
    { align: "center" }
  );

  doc.save(`Relatorio_Contrato_${contrato.numero.replace(/\//g, "-")}.pdf`);
}
