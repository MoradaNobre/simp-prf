import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { useContratos } from "@/hooks/useContratos";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { downloadFaturamentoReport, type FaturamentoReportData, type FaturamentoOSItem } from "@/utils/pdf/generateFaturamentoReport";
import { useUserProfile } from "@/hooks/useUserProfile";

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  orcamento: "Orçamento",
  autorizacao: "Autorização",
  execucao: "Execução",
  ateste: "Ateste",
  faturamento: "Faturamento",
  pagamento: "Pagamento",
  encerrada: "Encerrada",
};

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RelatoriosFaturamento() {
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data: contratos, isLoading: loadingContratos } = useContratos(effectiveRegionalId);
  const { data: profile } = useUserProfile();

  const [selectedContratoId, setSelectedContratoId] = useState<string>("");
  const [periodoInicio, setPeriodoInicio] = useState<Date>(startOfMonth(new Date()));
  const [periodoFim, setPeriodoFim] = useState<Date>(endOfMonth(new Date()));
  const [generating, setGenerating] = useState(false);

  const selectedContrato = useMemo(
    () => contratos?.find((c) => c.id === selectedContratoId),
    [contratos, selectedContratoId]
  );

  // Fetch OS for selected contract + period
  const { data: ordensData, isLoading: loadingOS } = useQuery({
    queryKey: ["faturamento-os", selectedContratoId, periodoInicio?.toISOString(), periodoFim?.toISOString()],
    queryFn: async () => {
      if (!selectedContratoId) return { ordens: [], saldo: null };

      // Fetch OS with status ateste, faturamento, pagamento or encerrada, filtered by contract
      const { data: osData, error: osErr } = await supabase
        .from("ordens_servico")
        .select("id, codigo, titulo, status, valor_orcamento, data_encerramento, data_abertura")
        .eq("contrato_id", selectedContratoId)
        .in("status", ["ateste", "faturamento", "pagamento", "encerrada"])
        .is("deleted_at", null)
        .gte("data_encerramento", periodoInicio.toISOString())
        .lte("data_encerramento", periodoFim.toISOString())
        .order("data_encerramento", { ascending: true });

      if (osErr) throw osErr;

      // Fetch valor_atestado from relatorios_os for these OS
      const osIds = (osData ?? []).map((o) => o.id);
      let relMap = new Map<string, number>();
      if (osIds.length > 0) {
        const { data: rels } = await supabase
          .from("relatorios_os")
          .select("os_id, valor_atestado")
          .in("os_id", osIds);
        (rels ?? []).forEach((r) => relMap.set(r.os_id, r.valor_atestado));
      }

      // Fetch contrato saldo
      const { data: saldoData } = await supabase
        .from("contratos_saldo" as any)
        .select("*")
        .eq("id", selectedContratoId)
        .maybeSingle();

      const ordens: FaturamentoOSItem[] = (osData ?? []).map((os) => ({
        codigo: os.codigo,
        titulo: os.titulo,
        valor_atestado: relMap.get(os.id) ?? os.valor_orcamento ?? 0,
        valor_orcamento: os.valor_orcamento ?? 0,
        data_encerramento: os.data_encerramento,
        status: os.status,
      }));

      return { ordens, saldo: saldoData as any };
    },
    enabled: !!selectedContratoId,
  });

  const ordens = ordensData?.ordens ?? [];
  const saldo = ordensData?.saldo;
  const totalAtestado = ordens.reduce((s, o) => s + (o.valor_atestado || 0), 0);

  const handleGerarPDF = () => {
    if (!selectedContrato || ordens.length === 0) {
      toast.error("Nenhuma OS encontrada para o período selecionado.");
      return;
    }
    setGenerating(true);
    try {
      const reportData: FaturamentoReportData = {
        contrato: {
          numero: selectedContrato.numero,
          empresa: selectedContrato.empresa,
          data_inicio: selectedContrato.data_inicio,
          data_fim: selectedContrato.data_fim,
          valor_total: selectedContrato.valor_total,
          saldo: saldo?.saldo ?? 0,
          valor_total_com_aditivos: saldo?.valor_total_com_aditivos ?? selectedContrato.valor_total,
        },
        periodo: {
          inicio: format(periodoInicio, "dd/MM/yyyy"),
          fim: format(periodoFim, "dd/MM/yyyy"),
        },
        ordens,
        fiscalNome: profile?.full_name,
      };
      downloadFaturamentoReport(reportData);
      toast.success("Relatório de faturamento gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-6">
      {/* Filters */}
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
              {(contratos ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.numero} — {c.empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Período Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !periodoInicio && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {periodoInicio ? format(periodoInicio, "dd/MM/yyyy") : "Selecionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodoInicio}
                onSelect={(d) => d && setPeriodoInicio(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Período Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !periodoFim && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {periodoFim ? format(periodoFim, "dd/MM/yyyy") : "Selecionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodoFim}
                onSelect={(d) => d && setPeriodoFim(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary */}
      {selectedContratoId && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            OS encontradas: <strong className="text-foreground">{ordens.length}</strong>
          </span>
          <span className="text-muted-foreground">
            Valor total: <strong className="text-foreground">{fmt(totalAtestado)}</strong>
          </span>
          <Button
            onClick={handleGerarPDF}
            disabled={generating || ordens.length === 0}
            className="ml-auto"
          >
            {generating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            Gerar PDF Consolidado
          </Button>
        </div>
      )}

      {/* Table */}
      {loadingOS && selectedContratoId ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : ordens.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="text-right">Valor Atestado</TableHead>
                <TableHead>Data Ateste</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.map((os) => (
                <TableRow key={os.codigo}>
                  <TableCell className="font-mono text-xs">{os.codigo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{os.titulo}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(os.valor_atestado)}</TableCell>
                  <TableCell className="text-xs">
                    {os.data_encerramento
                      ? new Date(os.data_encerramento).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{statusLabels[os.status] || os.status}</span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2} className="text-right">
                  Total
                </TableCell>
                <TableCell className="text-right">{fmt(totalAtestado)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : selectedContratoId ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma OS atestada encontrada para o contrato e período selecionados.
        </p>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Selecione um contrato e período para buscar as OS.
        </p>
      )}
    </Card>
  );
}
