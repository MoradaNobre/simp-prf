import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertTriangle, CheckCircle, Clock, TrendingUp, Building2 } from "lucide-react";
import { differenceInHours, startOfMonth } from "date-fns";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";

function useDashboardData(regionalId?: string | null) {
  return useQuery({
    queryKey: ["dashboard-stats", regionalId],
    queryFn: async () => {
      // Fetch all base data
      const [osRes, uopsRes, equipRes, delegaciasRes] = await Promise.all([
        supabase.from("ordens_servico").select("id, status, tipo, prioridade, data_abertura, data_encerramento, uop_id"),
        supabase.from("uops").select("id, area_m2, delegacia_id"),
        supabase.from("equipamentos").select("id, uop_id"),
        regionalId
          ? supabase.from("delegacias").select("id").eq("regional_id", regionalId)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (osRes.error) throw osRes.error;
      if (uopsRes.error) throw uopsRes.error;

      let uops = uopsRes.data ?? [];
      let os = osRes.data ?? [];
      let equips = equipRes.data ?? [];

      // Filter by regional if needed
      if (regionalId && delegaciasRes.data) {
        const delegaciaIds = new Set(delegaciasRes.data.map(d => d.id));
        uops = uops.filter(u => delegaciaIds.has(u.delegacia_id));
        const uopIds = new Set(uops.map(u => u.id));
        os = os.filter(o => o.uop_id && uopIds.has(o.uop_id));
        equips = equips.filter(e => uopIds.has((e as any).uop_id));
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

      const uopsComOsAberta = new Set(abertas.map((o) => o.uop_id).filter(Boolean));
      const totalUops = uops.length || 1;
      const disponibilidade = Math.round(((totalUops - uopsComOsAberta.size) / totalUops) * 100 * 10) / 10;

      const areaTotal = uops.reduce((s, u) => s + (u.area_m2 ?? 0), 0);

      return {
        abertas: abertas.length,
        urgentes: urgentes.length,
        concluidasMes: concluidasMes.length,
        mttr,
        pctCorretiva,
        pctPreventiva,
        disponibilidade,
        backlog: abertas.length,
        totalUops: uops.length,
        totalEquipamentos: equips.length,
        areaTotal,
      };
    },
    refetchInterval: 30_000,
  });
}

export default function Dashboard() {
  const { isNacional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data, isLoading } = useDashboardData(effectiveRegionalId);

  const stats = [
    { label: "OS Abertas (Backlog)", value: isLoading ? "…" : String(data?.abertas ?? 0), icon: ClipboardList, color: "text-blue-500" },
    { label: "Urgentes", value: isLoading ? "…" : String(data?.urgentes ?? 0), icon: AlertTriangle, color: "text-destructive" },
    { label: "Concluídas (mês)", value: isLoading ? "…" : String(data?.concluidasMes ?? 0), icon: CheckCircle, color: "text-green-500" },
    {
      label: "MTTR Médio",
      value: isLoading ? "…" : data?.mttr ? `${data.mttr.toFixed(1)}h` : "—",
      icon: Clock,
      color: "text-amber-500",
    },
  ];

  const summaryStats = [
    { label: "Total de UOPs", value: isLoading ? "…" : String(data?.totalUops ?? 0), icon: Building2 },
    { label: "Equipamentos", value: isLoading ? "…" : String(data?.totalEquipamentos ?? 0), icon: TrendingUp },
  ];

  const pctCorretiva = data?.pctCorretiva ?? 0;
  const pctPreventiva = data?.pctPreventiva ?? 0;
  const disponibilidade = data?.disponibilidade ?? 0;

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
            <CardTitle className="text-lg">Disponibilidade Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">{isLoading ? "…" : `${disponibilidade}%`}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                UOPs sem ordens de serviço abertas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {summaryStats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
