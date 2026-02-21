import { useState } from "react";
import { isAdminRole } from "@/utils/roles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, AlertTriangle, CheckCircle, Clock, Building2,
  DollarSign, FileText, ShieldCheck, Hammer, FileCheck, CreditCard,
} from "lucide-react";
import { differenceInMinutes, startOfMonth } from "date-fns";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { useUserRole } from "@/hooks/useUserRole";
import DashboardOrcamento from "@/components/dashboard/DashboardOrcamento";
import { useContratos } from "@/hooks/useContratos";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguard. Autorização",
  execucao: "Execução", ateste: "Ateste", pagamento: "Pagamento", encerrada: "Encerrada",
};

const statusIcons: Record<string, any> = {
  aberta: FileText, orcamento: DollarSign, autorizacao: ShieldCheck,
  execucao: Hammer, ateste: FileCheck, pagamento: CreditCard, encerrada: CheckCircle,
};

const statusCardColors: Record<string, string> = {
  aberta: "text-blue-500",
  orcamento: "text-orange-500",
  autorizacao: "text-purple-500",
  execucao: "text-cyan-500",
  ateste: "text-indigo-500",
  pagamento: "text-emerald-500",
  encerrada: "text-muted-foreground",
};

function useDashboardData(regionalId?: string | null, contratoId?: string | null) {
  return useQuery({
    queryKey: ["dashboard-stats", regionalId, contratoId],
    queryFn: async () => {
      const [osRes, uopsRes, delegaciasRes, custosRes] = await Promise.all([
        supabase.from("ordens_servico").select("id, status, tipo, prioridade, data_abertura, data_encerramento, uop_id, regional_id, valor_orcamento, updated_at, contrato_id"),
        supabase.from("uops").select("id, area_m2, delegacia_id"),
        regionalId
          ? supabase.from("delegacias").select("id").eq("regional_id", regionalId)
          : Promise.resolve({ data: null, error: null }),
        supabase.from("os_custos").select("os_id, valor"),
      ]);

      if (osRes.error) throw osRes.error;
      if (uopsRes.error) throw uopsRes.error;

      let uops = uopsRes.data ?? [];
      let os = osRes.data ?? [];
      const custos = custosRes.data ?? [];

      if (regionalId) {
        const delegaciaIds = delegaciasRes.data ? new Set(delegaciasRes.data.map(d => d.id)) : new Set<string>();
        const uopIdsInRegional = new Set(uops.filter(u => delegaciaIds.has(u.delegacia_id)).map(u => u.id));
        os = os.filter(o => o.regional_id === regionalId || (o.uop_id && uopIdsInRegional.has(o.uop_id)));
        uops = uops.filter(u => delegaciaIds.has(u.delegacia_id));
      }

      // Filter by contract
      if (contratoId) {
        os = os.filter(o => o.contrato_id === contratoId);
      }

      const mesAtual = startOfMonth(new Date());
      const abertas = os.filter((o) => o.status !== "encerrada");
      const urgentes = abertas.filter((o) => o.prioridade === "urgente");
      const concluidasMes = os.filter(
        (o) => o.status === "encerrada" && o.data_encerramento && new Date(o.data_encerramento) >= mesAtual
      );

      const encerradas = os.filter((o) => o.status === "encerrada" && o.data_encerramento);
      let mttr = 0;
      if (encerradas.length > 0) {
        const totalMinutos = encerradas.reduce((sum, o) => {
          return sum + differenceInMinutes(new Date(o.data_encerramento!), new Date(o.data_abertura));
        }, 0);
        mttr = totalMinutos / encerradas.length / 60;
      }

      const totalOS = os.length || 1;
      const corretivas = os.filter((o) => o.tipo === "corretiva").length;
      const preventivas = os.filter((o) => o.tipo === "preventiva").length;
      const pctCorretiva = Math.round((corretivas / totalOS) * 100);
      const pctPreventiva = Math.round((preventivas / totalOS) * 100);

      const osPorPrioridade: Record<string, number> = {};
      for (const p of ["baixa", "media", "alta", "urgente"]) {
        osPorPrioridade[p] = abertas.filter((o) => o.prioridade === p).length;
      }

      const osPorStatus: Record<string, number> = {};
      for (const s of Object.keys(statusLabels)) {
        osPorStatus[s] = os.filter((o) => o.status === s).length;
      }

      const osIds = new Set(os.map(o => o.id));
      const custosFiltered = custos.filter(c => osIds.has(c.os_id));

      const valorTotalOrcamentos = os.reduce((sum, o) => sum + (Number(o.valor_orcamento) || 0), 0);
      const valorTotalCustos = custosFiltered.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
      const valorOrcamentosMes = concluidasMes.reduce((sum, o) => sum + (Number(o.valor_orcamento) || 0), 0);

      const areaTotal = uops.reduce((s, u) => s + (u.area_m2 ?? 0), 0);
      const custoM2 = areaTotal > 0 ? valorTotalCustos / areaTotal : 0;

      const now = new Date();
      const tempoPorEtapa: Record<string, { total: number; count: number }> = {};
      for (const s of Object.keys(statusLabels)) {
        tempoPorEtapa[s] = { total: 0, count: 0 };
      }
      for (const o of os) {
        const minutosNaEtapa = differenceInMinutes(
          o.status === "encerrada" && o.data_encerramento ? new Date(o.data_encerramento) : now,
          new Date(o.updated_at)
        );
        const horasNaEtapa = minutosNaEtapa / 60;
        if (tempoPorEtapa[o.status]) {
          tempoPorEtapa[o.status].total += Math.max(0, horasNaEtapa);
          tempoPorEtapa[o.status].count += 1;
        }
      }
      const tempoMedioEtapa: Record<string, number> = {};
      for (const [s, v] of Object.entries(tempoPorEtapa)) {
        tempoMedioEtapa[s] = v.count > 0 ? v.total / v.count : 0;
      }

      return {
        abertas: abertas.length,
        urgentes: urgentes.length,
        concluidasMes: concluidasMes.length,
        mttr,
        pctCorretiva,
        pctPreventiva,
        backlog: abertas.length,
        totalUops: uops.length,
        areaTotal,
        osPorStatus,
        osPorPrioridade,
        valorTotalOrcamentos,
        valorTotalCustos,
        valorOrcamentosMes,
        custoM2,
        tempoMedioEtapa,
      };
    },
    refetchInterval: 30_000,
  });
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Dashboard() {
  const { isNacional, canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data: role } = useUserRole();
  const [selectedContratoId, setSelectedContratoId] = useState<string>("");
  const { data, isLoading } = useDashboardData(effectiveRegionalId, selectedContratoId || null);
  const { data: contratos = [] } = useContratos(effectiveRegionalId);
  const canSeeOrcamento = isAdminRole(role) || role === "gestor_regional" || role === "fiscal_contrato";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral — dados em tempo real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canFilterRegional && (
            <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
          )}
          <Select value={selectedContratoId || "all"} onValueChange={(v) => setSelectedContratoId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Contratos</SelectItem>
              {contratos.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.numero} — {c.empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canSeeOrcamento ? (
        <Tabs defaultValue="operacional">
          <TabsList>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
          </TabsList>
          <TabsContent value="operacional" className="space-y-6 mt-4">
            <DashboardOperacional data={data} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="orcamento" className="mt-4">
            <DashboardOrcamento regionalId={effectiveRegionalId} />
          </TabsContent>
        </Tabs>
      ) : (
        <DashboardOperacional data={data} isLoading={isLoading} />
      )}
    </div>
  );
}

function DashboardOperacional({ data, isLoading }: { data: any; isLoading: boolean }) {
  const pctCorretiva = data?.pctCorretiva ?? 0;
  const pctPreventiva = data?.pctPreventiva ?? 0;
  const flowStatuses = ["aberta", "orcamento", "autorizacao", "execucao", "ateste", "pagamento", "encerrada"];

  const stats = [
    { label: "OS Abertas (Backlog)", value: isLoading ? "…" : String(data?.abertas ?? 0), icon: ClipboardList, color: "text-blue-500" },
    { label: "Urgentes", value: isLoading ? "…" : String(data?.urgentes ?? 0), icon: AlertTriangle, color: "text-destructive" },
    { label: "Concluídas (mês)", value: isLoading ? "…" : String(data?.concluidasMes ?? 0), icon: CheckCircle, color: "text-emerald-500" },
    { label: "MTTR Médio", value: isLoading ? "…" : data?.mttr ? `${data.mttr.toFixed(1)}h` : "—", icon: Clock, color: "text-amber-500" },
  ];

  const financeStats = [
    { label: "Orçamentos (total)", value: isLoading ? "…" : formatBRL(data?.valorTotalOrcamentos ?? 0), icon: DollarSign, color: "text-primary" },
    { label: "Custos Realizados", value: isLoading ? "…" : formatBRL(data?.valorTotalCustos ?? 0), icon: CreditCard, color: "text-emerald-500" },
    { label: "Faturado no Mês", value: isLoading ? "…" : formatBRL(data?.valorOrcamentosMes ?? 0), icon: CheckCircle, color: "text-blue-500" },
    { label: "Custo por m²", value: isLoading ? "…" : data?.custoM2 ? formatBRL(data.custoM2) : "—", icon: Building2, color: "text-amber-500" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Valores (R$)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {financeStats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">OS por Etapa do Fluxo</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {flowStatuses.map((status) => {
            const Icon = statusIcons[status];
            const count = data?.osPorStatus?.[status] ?? 0;
            return (
              <Card key={status} className="text-center">
                <CardContent className="pt-4 pb-3 px-2">
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${statusCardColors[status]}`} />
                  <div className="text-2xl font-bold">{isLoading ? "…" : count}</div>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-1">{statusLabels[status]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Corretiva vs. Preventiva</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm"><span>Corretiva</span><span className="font-medium">{pctCorretiva}%</span></div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-destructive transition-all" style={{ width: `${pctCorretiva}%` }} />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm"><span>Preventiva</span><span className="font-medium">{pctPreventiva}%</span></div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pctPreventiva}%` }} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Meta: 30% corretiva / 70% preventiva</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">OS por Prioridade</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["urgente", "alta", "media", "baixa"] as const).map((p) => {
                const count = data?.osPorPrioridade?.[p] ?? 0;
                const total = data?.abertas || 1;
                const pct = Math.round((count / total) * 100);
                const colors: Record<string, string> = { urgente: "bg-destructive", alta: "bg-orange-500", media: "bg-amber-500", baixa: "bg-blue-400" };
                const labels: Record<string, string> = { urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa" };
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{labels[p]}</span><span className="font-medium">{isLoading ? "…" : count}</span></div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${colors[p]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tempo Médio por Etapa</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          {flowStatuses.filter(s => s !== "encerrada").map((status) => {
            const Icon = statusIcons[status];
            const horas = data?.tempoMedioEtapa?.[status] ?? 0;
            const display = isLoading ? "…" : horas < 1 ? `${Math.round(horas * 60)}min` : horas < 24 ? `${horas.toFixed(1)}h` : `${(horas / 24).toFixed(1)}d`;
            return (
              <Card key={status} className="text-center">
                <CardContent className="pt-4 pb-3 px-2">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${statusCardColors[status]}`} />
                  <div className="text-xl font-bold">{display}</div>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">{statusLabels[status]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
