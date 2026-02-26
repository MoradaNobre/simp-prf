import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquarePlus, Clock, Link2, XCircle, AlertTriangle, ClipboardCheck } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  hidraulico: "Hidráulico",
  eletrico: "Elétrico",
  iluminacao: "Iluminação",
  incendio: "Incêndio",
  estrutura: "Estrutura",
  rede_logica: "Rede Lógica",
  elevadores: "Elevadores",
  ar_condicionado: "Ar Condicionado",
  instalacoes_diversas: "Instalações Diversas",
};

function useDashboardChamados(regionalId?: string | null) {
  return useQuery({
    queryKey: ["dashboard-chamados", regionalId],
    queryFn: async () => {
      let q = supabase.from("chamados").select("id, status, tipo_demanda, prioridade, created_at, regional_id");
      if (regionalId) q = q.eq("regional_id", regionalId);
      const { data, error } = await q;
      if (error) throw error;
      const chamados = data ?? [];

      const abertos = chamados.filter(c => c.status === "aberto").length;
      const analisados = chamados.filter(c => c.status === "analisado").length;
      const vinculados = chamados.filter(c => c.status === "vinculado").length;
      const cancelados = chamados.filter(c => c.status === "cancelado").length;
      const urgentes = chamados.filter(c => (c.status === "aberto" || c.status === "analisado") && c.prioridade === "urgente").length;

      // By type
      const porTipo: Record<string, number> = {};
      for (const c of chamados.filter(ch => ch.status === "aberto")) {
        porTipo[c.tipo_demanda] = (porTipo[c.tipo_demanda] || 0) + 1;
      }

      // By priority (abertos only)
      const porPrioridade: Record<string, number> = {};
      for (const p of ["baixa", "media", "alta", "urgente"]) {
        porPrioridade[p] = chamados.filter(c => c.status === "aberto" && c.prioridade === p).length;
      }

      return { total: chamados.length, abertos, analisados, vinculados, cancelados, urgentes, porTipo, porPrioridade };
    },
    refetchInterval: 30_000,
  });
}

interface Props {
  regionalId?: string | null;
}

export default function DashboardChamados({ regionalId }: Props) {
  const { data, isLoading } = useDashboardChamados(regionalId);

  const kpis = [
    { label: "Abertos", value: data?.abertos ?? 0, icon: Clock, color: "text-blue-500" },
    { label: "Analisados", value: data?.analisados ?? 0, icon: ClipboardCheck, color: "text-amber-500" },
    { label: "Urgentes", value: data?.urgentes ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Vinculados a OS", value: data?.vinculados ?? 0, icon: Link2, color: "text-emerald-500" },
    { label: "Cancelados", value: data?.cancelados ?? 0, icon: XCircle, color: "text-muted-foreground" },
  ];

  const tipoEntries = Object.entries(data?.porTipo ?? {}).sort((a, b) => b[1] - a[1]);
  const maxTipo = tipoEntries.length > 0 ? tipoEntries[0][1] : 1;

  const prioLabels: Record<string, string> = { urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa" };
  const prioColors: Record<string, string> = { urgente: "bg-destructive", alta: "bg-orange-500", media: "bg-amber-500", baixa: "bg-blue-400" };
  const totalAbertos = data?.abertos || 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? "…" : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" /> Chamados Abertos por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tipoEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum chamado aberto.</p>
            ) : (
              <div className="space-y-3">
                {tipoEntries.map(([tipo, count]) => (
                  <div key={tipo} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{TIPO_LABELS[tipo] || tipo}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / maxTipo) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chamados Abertos por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["urgente", "alta", "media", "baixa"] as const).map((p) => {
                const count = data?.porPrioridade?.[p] ?? 0;
                const pct = Math.round((count / totalAbertos) * 100);
                return (
                  <div key={p} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{prioLabels[p]}</span>
                      <span className="font-medium">{isLoading ? "…" : count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${prioColors[p]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
