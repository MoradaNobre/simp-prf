import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList, AlertTriangle, CheckCircle, Clock, Building2,
  DollarSign, FileText, Search, ShieldCheck, Hammer, FileCheck, CreditCard,
} from "lucide-react";
import { differenceInHours, startOfMonth } from "date-fns";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", triagem: "Triagem", orcamento: "Orçamento", autorizacao: "Aguard. Autorização",
  execucao: "Execução", ateste: "Ateste", pagamento: "Pagamento", encerrada: "Encerrada",
};

const statusIcons: Record<string, any> = {
  aberta: FileText, triagem: Search, orcamento: DollarSign, autorizacao: ShieldCheck,
  execucao: Hammer, ateste: FileCheck, pagamento: CreditCard, encerrada: CheckCircle,
};

const statusCardColors: Record<string, string> = {
  aberta: "text-blue-500",
  triagem: "text-amber-500",
  orcamento: "text-orange-500",
  autorizacao: "text-purple-500",
  execucao: "text-cyan-500",
  ateste: "text-indigo-500",
  pagamento: "text-emerald-500",
  encerrada: "text-muted-foreground",
};

function useDashboardData(regionalId?: string | null) {
  return useQuery({
    queryKey: ["dashboard-stats", regionalId],
    queryFn: async () => {
      const [osRes, uopsRes, delegaciasRes, custosRes] = await Promise.all([
        supabase.from("ordens_servico").select("id, status, tipo, prioridade, data_abertura, data_encerramento, uop_id, valor_orcamento"),
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

      if (regionalId && delegaciasRes.data) {
        const delegaciaIds = new Set(delegaciasRes.data.map(d => d.id));
        uops = uops.filter(u => delegaciaIds.has(u.delegacia_id));
        const uopIds = new Set(uops.map(u => u.id));
        os = os.filter(o => o.uop_id && uopIds.has(o.uop_id));
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
        const totalHoras = encerradas.reduce((sum, o) => {
          return sum + differenceInHours(new Date(o.data_encerramento!), new Date(o.data_abertura));
        }, 0);
        mttr = totalHoras / encerradas.length;
      }

      const totalOS = os.length || 1;
      const corretivas = os.filter((o) => o.tipo === "corretiva").length;
      const preventivas = os.filter((o) => o.tipo === "preventiva").length;
      const pctCorretiva = Math.round((corretivas / totalOS) * 100);
      const pctPreventiva = Math.round((preventivas / totalOS) * 100);

      // OS count by status
      const osPorStatus: Record<string, number> = {};
      for (const s of Object.keys(statusLabels)) {
        osPorStatus[s] = os.filter((o) => o.status === s).length;
      }

      // Financial metrics
      const osIds = new Set(os.map(o => o.id));
      const custosFiltered = custos.filter(c => osIds.has(c.os_id));

      const valorTotalOrcamentos = os.reduce((sum, o) => sum + (Number(o.valor_orcamento) || 0), 0);
      const valorTotalCustos = custosFiltered.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);
      const valorOrcamentosMes = concluidasMes.reduce((sum, o) => sum + (Number(o.valor_orcamento) || 0), 0);

      const areaTotal = uops.reduce((s, u) => s + (u.area_m2 ?? 0), 0);
      const custoM2 = areaTotal > 0 ? valorTotalCustos / areaTotal : 0;

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
        valorTotalOrcamentos,
        valorTotalCustos,
        valorOrcamentosMes,
        custoM2,
      };
    },
    refetchInterval: 30_000,
  });
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Dashboard() {
  const { isNacional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data, isLoading } = useDashboardData(effectiveRegionalId);

  const stats = [
    { label: "OS Abertas (Backlog)", value: isLoading ? "…" : String(data?.abertas ?? 0), icon: ClipboardList, color: "text-blue-500" },
    { label: "Urgentes", value: isLoading ? "…" : String(data?.urgentes ?? 0), icon: AlertTriangle, color: "text-destructive" },
    { label: "Concluídas (mês)", value: isLoading ? "…" : String(data?.concluidasMes ?? 0), icon: CheckCircle, color: "text-emerald-500" },
    {
      label: "MTTR Médio",
      value: isLoading ? "…" : data?.mttr ? `${data.mttr.toFixed(1)}h` : "—",
      icon: Clock,
      color: "text-amber-500",
    },
  ];

  const financeStats = [
    { label: "Orçamentos (total)", value: isLoading ? "…" : formatBRL(data?.valorTotalOrcamentos ?? 0), icon: DollarSign, color: "text-primary" },
    { label: "Custos Realizados", value: isLoading ? "…" : formatBRL(data?.valorTotalCustos ?? 0), icon: CreditCard, color: "text-emerald-500" },
    { label: "Faturado no Mês", value: isLoading ? "…" : formatBRL(data?.valorOrcamentosMes ?? 0), icon: CheckCircle, color: "text-blue-500" },
    { label: "Custo por m²", value: isLoading ? "…" : data?.custoM2 ? formatBRL(data.custoM2) : "—", icon: Building2, color: "text-amber-500" },
  ];

  const pctCorretiva = data?.pctCorretiva ?? 0;
  const pctPreventiva = data?.pctPreventiva ?? 0;

  const flowStatuses = ["aberta", "triagem", "orcamento", "autorizacao", "execucao", "ateste", "pagamento", "encerrada"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da manutenção predial — dados em tempo real</p>
        </div>
        {isNacional && (
          <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
        )}
      </div>

      {/* KPIs principais */}
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

      {/* Métricas financeiras */}
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

      {/* OS por posição no fluxo */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">OS por Etapa do Fluxo</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
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

      {/* Corretiva vs Preventiva */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Corretiva vs. Preventiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Corretiva</span>
                  <span className="font-medium">{pctCorretiva}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-destructive transition-all" style={{ width: `${pctCorretiva}%` }} />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Preventiva</span>
                  <span className="font-medium">{pctPreventiva}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pctPreventiva}%` }} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Meta: 30% corretiva / 70% preventiva</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de UOPs</p>
                <p className="text-2xl font-bold">{isLoading ? "…" : data?.totalUops ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área Total</p>
                <p className="text-2xl font-bold">{isLoading ? "…" : `${(data?.areaTotal ?? 0).toLocaleString("pt-BR")} m²`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
