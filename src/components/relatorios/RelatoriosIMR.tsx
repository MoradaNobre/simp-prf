import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, Download, CalendarIcon, ChevronDown, Plus, Trash2, AlertTriangle,
  CheckCircle2, XCircle, AlertCircle, FileText, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { useContratos } from "@/hooks/useContratos";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { downloadIMRReport, type IMRReportData, type IMROcorrencia, type IMROSConsolidada } from "@/utils/pdf/generateIMRReport";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Autorização",
  execucao: "Execução", ateste: "Ateste", faturamento: "Faturamento",
  pagamento: "Pagamento", encerrada: "Encerrada",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
};

// IMR situação helpers
function getSituacao(imr: number) {
  if (imr >= 9) return { label: "Conforme", color: "text-green-600", icon: CheckCircle2, badge: "default" as const };
  if (imr >= 7) return { label: "Conduta Adversa", color: "text-yellow-600", icon: AlertCircle, badge: "secondary" as const };
  if (imr >= 5) return { label: "Com Penalização", color: "text-orange-600", icon: AlertTriangle, badge: "destructive" as const };
  return { label: "Crítico", color: "text-red-600", icon: XCircle, badge: "destructive" as const };
}

function getRetencao(imr: number) {
  if (imr >= 9) return 0;
  if (imr >= 8) return 2;
  if (imr >= 7) return 5;
  if (imr >= 5) return 10;
  return 20;
}

// ── Detection rules engine ──
function detectOcorrencias(
  osList: any[],
  custosMap: Map<string, number>,
  chamadosMap: Map<string, { gut_score: number | null }[]>
): IMROcorrencia[] {
  const ocorrencias: IMROcorrencia[] = [];

  osList.forEach((os) => {
    const totalCustos = custosMap.get(os.id) ?? 0;
    const orcamento = os.valor_orcamento ?? 0;

    // Rule 1: Atraso no prazo de execução
    if (os.prazo_execucao && os.data_encerramento) {
      const prazo = new Date(os.prazo_execucao);
      const encerramento = new Date(os.data_encerramento);
      if (encerramento > prazo) {
        const diasAtraso = differenceInDays(encerramento, prazo);
        ocorrencias.push({
          os_codigo: os.codigo,
          tipo_falha: "Atraso no prazo de execução",
          regra_imr: diasAtraso > 15 ? "Item 9" : "Item 8",
          evidencia: `Prazo: ${fmtDate(os.prazo_execucao)}, Encerrada: ${fmtDate(os.data_encerramento)} (${diasAtraso} dias de atraso)`,
          quantidade: 1,
          pontos: diasAtraso > 15 ? 2.0 : 1.0,
          automatica: true,
        });
      }
    }

    // Rule 2: Prazo de orçamento excedido
    if (os.prazo_orcamento) {
      const prazoOrc = new Date(os.prazo_orcamento);
      // Check audit_logs for when status changed to 'orcamento' vs prazo
      // Simplified: if OS still doesn't have valor_orcamento after prazo
      if (orcamento === 0 && new Date() > prazoOrc && os.status !== "aberta") {
        ocorrencias.push({
          os_codigo: os.codigo,
          tipo_falha: "Prazo de orçamento excedido",
          regra_imr: "Item 8",
          evidencia: `Prazo orçamento: ${fmtDate(os.prazo_orcamento)}, sem orçamento registrado`,
          quantidade: 1,
          pontos: 1.0,
          automatica: true,
        });
      }
    }

    // Rule 3: Valor realizado zero em OS encerrada
    if (os.status === "encerrada" && totalCustos === 0 && orcamento > 0) {
      ocorrencias.push({
        os_codigo: os.codigo,
        tipo_falha: "Valor realizado zero em OS encerrada",
        regra_imr: "Item 1",
        evidencia: `OS encerrada com orçamento ${fmt(orcamento)} mas sem custos registrados`,
        quantidade: 1,
        pontos: 1.0,
        automatica: true,
      });
    }

    // Rule 4: Desvio orçamentário > 10%
    if (orcamento > 0 && totalCustos > 0) {
      const desvio = Math.abs(totalCustos - orcamento) / orcamento;
      if (desvio > 0.10) {
        const desvioPercent = (desvio * 100).toFixed(1);
        ocorrencias.push({
          os_codigo: os.codigo,
          tipo_falha: `Desvio orçamentário de ${desvioPercent}%`,
          regra_imr: "Item 1",
          evidencia: `Orçado: ${fmt(orcamento)}, Realizado: ${fmt(totalCustos)} (desvio de ${desvioPercent}%)`,
          quantidade: 1,
          pontos: desvio > 0.25 ? 1.0 : 0.5,
          automatica: true,
        });
      }
    }

    // Rule 5: GUT alto + demora excessiva
    const osChamados = chamadosMap.get(os.id) ?? [];
    const maxGut = Math.max(0, ...osChamados.map(c => c.gut_score ?? 0));
    if (maxGut >= 27) {
      const diasAberta = differenceInDays(new Date(), new Date(os.data_abertura));
      if (diasAberta > 30 && os.status !== "encerrada") {
        ocorrencias.push({
          os_codigo: os.codigo,
          tipo_falha: "Risco estrutural (GUT alto com demora)",
          regra_imr: "Item 19",
          evidencia: `GUT Score: ${maxGut}, OS aberta há ${diasAberta} dias sem encerramento`,
          quantidade: 1,
          pontos: 2.0,
          automatica: true,
        });
      }
    }
  });

  return ocorrencias;
}

export function RelatoriosIMR() {
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data: contratos, isLoading: loadingContratos } = useContratos(effectiveRegionalId);
  const { data: profile } = useUserProfile();
  const { user } = useAuth();

  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState<Date>(startOfMonth(new Date()));
  const [periodoFim, setPeriodoFim] = useState<Date>(endOfMonth(new Date()));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [manualOcorrencias, setManualOcorrencias] = useState<IMROcorrencia[]>([]);
  const [analiseQualitativa, setAnaliseQualitativa] = useState("");
  const [contraditorio, setContraditorio] = useState({
    status: "sem_manifestacao",
    dataEnvio: "",
  });
  const [decisaoFinal, setDecisaoFinal] = useState({
    imrReconsideracao: "",
    penalidade: "",
    encaminhamento: "arquivamento",
  });
  const [valorFatura, setValorFatura] = useState("");

  const selectedContrato = useMemo(
    () => contratos?.find(c => c.id === selectedContratoId),
    [contratos, selectedContratoId]
  );

  // Fetch OS + custos + chamados for selected contract + period
  const { data: imrData, isLoading: loadingData } = useQuery({
    queryKey: ["imr-data", selectedContratoId, periodoInicio.toISOString(), periodoFim.toISOString()],
    queryFn: async () => {
      if (!selectedContratoId) return null;

      // Fetch all OS for the contract in the period
      const { data: osData, error: osErr } = await supabase
        .from("ordens_servico")
        .select("id, codigo, titulo, status, tipo, prioridade, valor_orcamento, data_abertura, data_encerramento, prazo_execucao, prazo_orcamento, contrato_id, regional_id, uop_id")
        .eq("contrato_id", selectedContratoId)
        .is("deleted_at", null)
        .gte("data_abertura", periodoInicio.toISOString())
        .lte("data_abertura", periodoFim.toISOString())
        .order("data_abertura", { ascending: true });

      if (osErr) throw osErr;
      const osList = osData ?? [];
      const osIds = osList.map(o => o.id);

      // Fetch custos
      let custosMap = new Map<string, number>();
      if (osIds.length > 0) {
        const { data: custosData } = await supabase
          .from("os_custos")
          .select("os_id, valor")
          .in("os_id", osIds);
        (custosData ?? []).forEach(c => {
          custosMap.set(c.os_id, (custosMap.get(c.os_id) ?? 0) + c.valor);
        });
      }

      // Fetch chamados linked to these OS (for GUT)
      let chamadosMap = new Map<string, { gut_score: number | null }[]>();
      if (osIds.length > 0) {
        const { data: chamadosData } = await supabase
          .from("chamados")
          .select("os_id, gut_score")
          .in("os_id", osIds)
          .is("deleted_at", null);
        (chamadosData ?? []).forEach(ch => {
          if (!ch.os_id) return;
          const arr = chamadosMap.get(ch.os_id) ?? [];
          arr.push({ gut_score: ch.gut_score });
          chamadosMap.set(ch.os_id, arr);
        });
      }

      // Fetch valor_atestado from relatorios_os
      let atestadoMap = new Map<string, number>();
      if (osIds.length > 0) {
        const { data: rels } = await supabase
          .from("relatorios_os")
          .select("os_id, valor_atestado")
          .in("os_id", osIds);
        (rels ?? []).forEach(r => atestadoMap.set(r.os_id, r.valor_atestado));
      }

      // Auto-detect ocorrências
      const autoOcorrencias = detectOcorrencias(osList, custosMap, chamadosMap);

      return { osList, custosMap, chamadosMap, atestadoMap, autoOcorrencias };
    },
    enabled: !!selectedContratoId,
  });

  const osList = imrData?.osList ?? [];
  const autoOcorrencias = imrData?.autoOcorrencias ?? [];
  const allOcorrencias = [...autoOcorrencias, ...manualOcorrencias];
  const totalPontos = allOcorrencias.reduce((s, o) => s + o.pontos, 0);
  const imrScore = Math.max(0, 10 - totalPontos);
  const situacao = getSituacao(imrScore);
  const retencaoPercent = getRetencao(imrScore);
  const faturaVal = parseFloat(valorFatura.replace(",", ".")) || 0;
  const valorGlosa = faturaVal * (retencaoPercent / 100);

  const addManualOcorrencia = () => {
    setManualOcorrencias(prev => [...prev, {
      os_codigo: "",
      tipo_falha: "",
      regra_imr: "",
      evidencia: "",
      quantidade: 1,
      pontos: 0,
      automatica: false,
    }]);
  };

  const updateManualOcorrencia = (idx: number, field: keyof IMROcorrencia, value: any) => {
    setManualOcorrencias(prev => prev.map((o, i) =>
      i === idx ? { ...o, [field]: field === "pontos" || field === "quantidade" ? parseFloat(value) || 0 : value } : o
    ));
  };

  const removeManualOcorrencia = (idx: number) => {
    setManualOcorrencias(prev => prev.filter((_, i) => i !== idx));
  };

  const osConsolidadas: IMROSConsolidada[] = osList.map(os => ({
    codigo: os.codigo,
    tipo: os.tipo,
    prioridade: os.prioridade,
    data_abertura: os.data_abertura,
    data_encerramento: os.data_encerramento,
    valor: os.valor_orcamento ?? 0,
    status: os.status,
  }));

  const handleGerarPDF = () => {
    if (!selectedContrato || osList.length === 0) {
      toast.error("Nenhuma OS encontrada para o período selecionado.");
      return;
    }
    setGenerating(true);
    try {
      const reportData: IMRReportData = {
        contrato: { numero: selectedContrato.numero, empresa: selectedContrato.empresa },
        periodo: { inicio: format(periodoInicio, "dd/MM/yyyy"), fim: format(periodoFim, "dd/MM/yyyy"), mesAno: format(periodoInicio, "MM/yyyy") },
        fiscalNome: profile?.full_name ?? "",
        dataAvaliacao: format(new Date(), "dd/MM/yyyy"),
        unidadeAvaliada: "",
        imrScore,
        situacao: situacao.label,
        totalOcorrencias: allOcorrencias.length,
        totalPontosPerdidos: totalPontos,
        osConsolidadas,
        ocorrencias: allOcorrencias,
        valorFatura: faturaVal,
        percentualRetencao: retencaoPercent,
        valorGlosa,
        analiseQualitativa,
        contraditorio: {
          dataEnvio: contraditorio.dataEnvio,
          status: contraditorio.status,
        },
        decisaoFinal: {
          imrReconsideracao: parseFloat(decisaoFinal.imrReconsideracao) || undefined,
          penalidade: decisaoFinal.penalidade,
          encaminhamento: decisaoFinal.encaminhamento,
        },
      };
      downloadIMRReport(reportData);
      toast.success("Relatório IMR gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSalvar = async () => {
    if (!selectedContrato || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("relatorios_imr" as any).insert({
        contrato_id: selectedContratoId,
        regional_id: selectedContrato.regional_id,
        periodo_inicio: format(periodoInicio, "yyyy-MM-dd"),
        periodo_fim: format(periodoFim, "yyyy-MM-dd"),
        imr_score: imrScore,
        situacao: situacao.label.toLowerCase().replace(/ /g, "_"),
        total_ocorrencias: allOcorrencias.length,
        total_pontos_perdidos: totalPontos,
        valor_fatura: faturaVal,
        valor_glosa: valorGlosa,
        percentual_retencao: retencaoPercent,
        analise_qualitativa: analiseQualitativa || null,
        contraditorio_status: contraditorio.status,
        contraditorio_data_envio: contraditorio.dataEnvio || null,
        decisao_final: decisaoFinal.penalidade || null,
        imr_pos_reconsideracao: parseFloat(decisaoFinal.imrReconsideracao) || null,
        penalidade_aplicada: decisaoFinal.penalidade || null,
        encaminhamento: decisaoFinal.encaminhamento,
        ocorrencias: JSON.stringify(allOcorrencias),
        os_consolidadas: JSON.stringify(osConsolidadas),
        gerado_por_id: user.id,
      } as any);
      if (error) throw error;
      toast.success("Relatório IMR salvo com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const SituacaoIcon = situacao.icon;

  return (
    <div className="space-y-6">
      {/* ── Filtros ── */}
      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {canFilterRegional && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Regional</Label>
              <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Contrato</Label>
            <Select value={selectedContratoId} onValueChange={setSelectedContratoId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingContratos ? "Carregando..." : "Selecionar contrato"} />
              </SelectTrigger>
              <SelectContent>
                {(contratos ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.numero} — {c.empresa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Período Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodoInicio && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(periodoInicio, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={periodoInicio} onSelect={d => d && setPeriodoInicio(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Período Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodoFim && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(periodoFim, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={periodoFim} onSelect={d => d && setPeriodoFim(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {loadingData && selectedContratoId ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : osList.length === 0 && selectedContratoId ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma OS encontrada para o contrato e período selecionados.
        </p>
      ) : osList.length > 0 ? (
        <>
          {/* ── 2. Resumo Executivo ── */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo Executivo do IMR</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">IMR Calculado</p>
                <p className={cn("text-3xl font-bold", situacao.color)}>{imrScore.toFixed(1)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Meta</p>
                <p className="text-3xl font-bold">≥ 9,0</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Situação</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <SituacaoIcon className={cn("h-5 w-5", situacao.color)} />
                  <Badge variant={situacao.badge}>{situacao.label}</Badge>
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Ocorrências</p>
                <p className="text-3xl font-bold">{allOcorrencias.length}</p>
                <p className="text-xs text-muted-foreground">{totalPontos.toFixed(1)} pontos perdidos</p>
              </div>
            </div>
          </Card>

          {/* ── 3. Consolidação OS ── */}
          <Collapsible defaultOpen>
            <Card className="p-4 sm:p-6">
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <ChevronDown className="h-4 w-4 transition-transform" />
                <h3 className="text-lg font-semibold">Consolidação das OS do Período</h3>
                <Badge variant="secondary" className="ml-auto">{osList.length} OS</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Data Abertura</TableHead>
                        <TableHead>Data Encerramento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {osList.map(os => (
                        <TableRow key={os.id}>
                          <TableCell className="font-mono text-xs">{os.codigo}</TableCell>
                          <TableCell className="capitalize text-xs">{os.tipo}</TableCell>
                          <TableCell className="text-xs">{prioridadeLabels[os.prioridade] ?? os.prioridade}</TableCell>
                          <TableCell className="text-xs">{fmtDate(os.data_abertura)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(os.data_encerramento)}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{fmt(os.valor_orcamento ?? 0)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{statusLabels[os.status] ?? os.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* ── 4. Matriz de Ocorrências ── */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Matriz de Ocorrências (Base do IMR)</h3>
              <Button size="sm" variant="outline" onClick={addManualOcorrencia}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Ocorrência
              </Button>
            </div>

            {allOcorrencias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma ocorrência detectada. O IMR está conforme.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Tipo de Falha</TableHead>
                      <TableHead>Regra IMR</TableHead>
                      <TableHead>Evidência</TableHead>
                      <TableHead className="text-center">Qtde</TableHead>
                      <TableHead className="text-right">Pontos</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {autoOcorrencias.map((oc, i) => (
                      <TableRow key={`auto-${i}`} className="bg-muted/30">
                        <TableCell className="font-mono text-xs">{oc.os_codigo}</TableCell>
                        <TableCell className="text-xs">{oc.tipo_falha}</TableCell>
                        <TableCell className="text-xs font-medium">{oc.regra_imr}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={oc.evidencia}>{oc.evidencia}</TableCell>
                        <TableCell className="text-center text-xs">{oc.quantidade}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-destructive">{oc.pontos.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {manualOcorrencias.map((oc, i) => (
                      <TableRow key={`manual-${i}`}>
                        <TableCell>
                          <Input className="h-7 text-xs w-24" value={oc.os_codigo}
                            onChange={e => updateManualOcorrencia(i, "os_codigo", e.target.value)}
                            placeholder="OS-..." />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs" value={oc.tipo_falha}
                            onChange={e => updateManualOcorrencia(i, "tipo_falha", e.target.value)}
                            placeholder="Tipo de falha" />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs w-20" value={oc.regra_imr}
                            onChange={e => updateManualOcorrencia(i, "regra_imr", e.target.value)}
                            placeholder="Item X" />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs" value={oc.evidencia}
                            onChange={e => updateManualOcorrencia(i, "evidencia", e.target.value)}
                            placeholder="Evidência" />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs w-14 text-center" type="number" value={oc.quantidade}
                            onChange={e => updateManualOcorrencia(i, "quantidade", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs w-16 text-right" type="number" step="0.5" value={oc.pontos}
                            onChange={e => updateManualOcorrencia(i, "pontos", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeManualOcorrencia(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={5} className="text-right text-sm">Total de Pontos Perdidos</TableCell>
                      <TableCell className="text-right text-sm text-destructive">{totalPontos.toFixed(1)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* ── 6 & 7. Cálculo IMR + Impacto Financeiro ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-6 space-y-3">
              <h3 className="text-lg font-semibold">Cálculo do IMR</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Fórmula:</span><span className="font-mono">IMR = 10 - Σ(pontos)</span></div>
                <div className="flex justify-between"><span>Pontos perdidos:</span><span className="font-bold text-destructive">{totalPontos.toFixed(1)}</span></div>
                <div className="flex justify-between text-lg"><span className="font-semibold">IMR Final:</span><span className={cn("font-bold", situacao.color)}>{imrScore.toFixed(1)}</span></div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 space-y-3">
              <h3 className="text-lg font-semibold">Impacto Financeiro</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Faixa do IMR:</span><Badge variant={situacao.badge}>{situacao.label}</Badge></div>
                <div className="flex justify-between"><span>% Retenção:</span><span className="font-bold">{retencaoPercent}%</span></div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor da Fatura (R$)</Label>
                  <Input value={valorFatura} onChange={e => setValorFatura(e.target.value)} placeholder="0,00" className="h-8" />
                </div>
                {faturaVal > 0 && (
                  <div className="flex justify-between text-destructive font-semibold">
                    <span>Valor da Glosa:</span><span>{fmt(valorGlosa)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── 8. Análise Qualitativa ── */}
          <Card className="p-4 sm:p-6 space-y-3">
            <h3 className="text-lg font-semibold">Análise Qualitativa do Fiscal</h3>
            <Textarea
              value={analiseQualitativa}
              onChange={e => setAnaliseQualitativa(e.target.value)}
              placeholder="Avaliação da execução, pontos críticos, reincidência, riscos operacionais..."
              rows={5}
            />
          </Card>

          {/* ── 9. Contraditório ── */}
          <Card className="p-4 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold">Direito ao Contraditório</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Data de envio à contratada</Label>
                <Input type="date" value={contraditorio.dataEnvio}
                  onChange={e => setContraditorio(p => ({ ...p, dataEnvio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo para manifestação</Label>
                <Input disabled value="5 dias úteis" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Situação</Label>
                <Select value={contraditorio.status} onValueChange={v => setContraditorio(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_manifestacao">Sem manifestação</SelectItem>
                    <SelectItem value="em_analise">Em análise</SelectItem>
                    <SelectItem value="acatada">Acatada</SelectItem>
                    <SelectItem value="indeferida">Indeferida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* ── 10. Decisão Final ── */}
          <Card className="p-4 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold">Decisão Final</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">IMR após reconsideração</Label>
                <Input value={decisaoFinal.imrReconsideracao}
                  onChange={e => setDecisaoFinal(p => ({ ...p, imrReconsideracao: e.target.value }))}
                  placeholder="Ex: 9.5" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Penalidade aplicada</Label>
                <Input value={decisaoFinal.penalidade}
                  onChange={e => setDecisaoFinal(p => ({ ...p, penalidade: e.target.value }))}
                  placeholder="Descrever penalidade" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Encaminhamento</Label>
                <Select value={decisaoFinal.encaminhamento} onValueChange={v => setDecisaoFinal(p => ({ ...p, encaminhamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arquivamento">Arquivamento</SelectItem>
                    <SelectItem value="glosa">Glosa</SelectItem>
                    <SelectItem value="processo_sancionador">Abertura de processo sancionador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* ── Ações ── */}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" onClick={handleSalvar} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
              Salvar Relatório
            </Button>
            <Button onClick={handleGerarPDF} disabled={generating}>
              {generating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
              Gerar PDF IMR
            </Button>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Selecione um contrato e período para gerar o IMR.
        </p>
      )}
    </div>
  );
}
