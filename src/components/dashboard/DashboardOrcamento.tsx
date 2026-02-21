import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/utils/roles";

const currentYear = new Date().getFullYear();
const yearRange = Array.from({ length: 10 }, (_, i) => currentYear - 7 + i);

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortBRL(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

interface DashboardOrcamentoProps {
  regionalId?: string | null;
  userRole?: string | null;
}

export default function DashboardOrcamento({ regionalId, userRole }: DashboardOrcamentoProps) {
  const [exercicio, setExercicio] = useState(currentYear);
  const [sortChart1, setSortChart1] = useState<"sigla" | "dotacaoTotal" | "totalConsumido">("dotacaoTotal");

  const isAdmin = isAdminRole(userRole) || userRole === "gestor_master";
  const isGestorNacional = userRole === "gestor_nacional";
  const showFullDashboard = isAdmin || isGestorNacional;

  const { data: orcamentos, isLoading: orcLoading } = useQuery({
    queryKey: ["dash-orcamento-anual", exercicio, regionalId],
    queryFn: async () => {
      let q = supabase
        .from("orcamento_anual" as any)
        .select("*, regional:regionais(id, nome, sigla)")
        .eq("exercicio", exercicio)
        .order("created_at");
      if (regionalId) q = q.eq("regional_id", regionalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: creditos } = useQuery({
    queryKey: ["dash-orcamento-creditos", exercicio],
    queryFn: async () => {
      const orcIds = (orcamentos || []).map((o: any) => o.id);
      if (!orcIds.length) return [];
      const { data, error } = await supabase
        .from("orcamento_creditos" as any)
        .select("*")
        .in("orcamento_id", orcIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: (orcamentos?.length ?? 0) > 0,
  });

  const { data: empenhos } = useQuery({
    queryKey: ["dash-orcamento-empenhos", exercicio],
    queryFn: async () => {
      const orcIds = (orcamentos || []).map((o: any) => o.id);
      if (!orcIds.length) return [];
      const { data, error } = await supabase
        .from("orcamento_empenhos" as any)
        .select("*")
        .in("orcamento_id", orcIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: (orcamentos?.length ?? 0) > 0,
  });

  const { data: custosOS } = useQuery({
    queryKey: ["dash-os-custos", exercicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos")
        .select("valor, os_id, ordens_servico!inner(regional_id, data_abertura)")
        .gte("ordens_servico.data_abertura", `${exercicio}-01-01`)
        .lte("ordens_servico.data_abertura", `${exercicio}-12-31`);
      if (error) throw error;
      return data as any[];
    },
  });

  // Query for delegacia-level consumption
  const { data: custosDelegacia } = useQuery({
    queryKey: ["dash-custos-delegacia", exercicio, regionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos")
        .select("valor, ordens_servico!inner(uop_id, data_abertura, regional_id)")
        .gte("ordens_servico.data_abertura", `${exercicio}-01-01`)
        .lte("ordens_servico.data_abertura", `${exercicio}-12-31`);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: delegacias } = useQuery({
    queryKey: ["dash-delegacias", regionalId],
    queryFn: async () => {
      let q = supabase.from("delegacias").select("id, nome, regional_id");
      if (regionalId) q = q.eq("regional_id", regionalId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: uops } = useQuery({
    queryKey: ["dash-uops-delegacia", regionalId],
    queryFn: async () => {
      const delegaciaIds = (delegacias || []).map(d => d.id);
      if (!delegaciaIds.length) return [];
      const { data, error } = await supabase
        .from("uops")
        .select("id, nome, delegacia_id")
        .in("delegacia_id", delegaciaIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: (delegacias?.length ?? 0) > 0,
  });

  const consumoPorDelegacia = useMemo(() => {
    if (!custosDelegacia || !delegacias || !uops) return [];
    const uopToDelegacia = new Map<string, string>();
    for (const u of uops) {
      uopToDelegacia.set(u.id, u.delegacia_id);
    }
    const delegaciaMap = new Map<string, { nome: string; total: number }>();
    for (const d of delegacias) {
      delegaciaMap.set(d.id, { nome: d.nome, total: 0 });
    }
    for (const c of custosDelegacia) {
      const uopId = c.ordens_servico?.uop_id;
      if (!uopId) continue;
      const delId = uopToDelegacia.get(uopId);
      if (!delId) continue;
      const entry = delegaciaMap.get(delId);
      if (entry) entry.total += Number(c.valor);
    }
    return Array.from(delegaciaMap.values())
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [custosDelegacia, delegacias, uops]);

  const consumoPorUOP = useMemo(() => {
    if (!custosDelegacia || !uops) return [];
    const uopMap = new Map<string, { nome: string; total: number }>();
    for (const u of uops) {
      uopMap.set(u.id, { nome: u.nome, total: 0 });
    }
    for (const c of custosDelegacia) {
      const uopId = c.ordens_servico?.uop_id;
      if (!uopId) continue;
      const entry = uopMap.get(uopId);
      if (entry) entry.total += Number(c.valor);
    }
    return Array.from(uopMap.values())
      .filter(u => u.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [custosDelegacia, uops]);

  const consolidado = useMemo(() => {
    if (!orcamentos) return [];
    return orcamentos.map((orc: any) => {
      const creds = (creditos || []).filter((c: any) => c.orcamento_id === orc.id);
      const totalCreditos = creds.reduce((s: number, c: any) => {
        const v = Number(c.valor);
        return c.tipo === "reducao" ? s - v : s + v;
      }, 0);
      const dotacaoTotal = Number(orc.valor_dotacao) + totalCreditos;
      const emps = (empenhos || []).filter((e: any) => e.orcamento_id === orc.id);
      const totalEmpenhos = emps.reduce((s: number, e: any) => s + Number(e.valor), 0);
      const custos = (custosOS || []).filter((c: any) => c.ordens_servico?.regional_id === orc.regional_id);
      const totalCustosOS = custos.reduce((s: number, c: any) => s + Number(c.valor), 0);
      const totalConsumido = totalEmpenhos + totalCustosOS;
      const saldo = dotacaoTotal - totalConsumido;
      const percentual = dotacaoTotal > 0 ? (totalConsumido / dotacaoTotal) * 100 : 0;
      return {
        sigla: orc.regional?.sigla || "—",
        dotacaoTotal,
        totalCustosOS,
        totalEmpenhos,
        totalConsumido,
        saldo,
        percentual,
      };
    }).sort((a: any, b: any) => a.sigla.localeCompare(b.sigla));
  }, [orcamentos, creditos, empenhos, custosOS]);

  const totalGeral = useMemo(() => {
    const dotacao = consolidado.reduce((s, i) => s + i.dotacaoTotal, 0);
    const consumido = consolidado.reduce((s, i) => s + i.totalConsumido, 0);
    const saldo = dotacao - consumido;
    const pct = dotacao > 0 ? (consumido / dotacao) * 100 : 0;
    return { dotacao, consumido, saldo, pct };
  }, [consolidado]);

  if (orcLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-foreground">Panorama Orçamentário — {exercicio}</h2>
        <Select value={String(exercicio)} onValueChange={(v) => setExercicio(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearRange.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs globais — visível para todos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cota Total</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{formatBRL(totalGeral.dotacao)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Consumido</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{formatBRL(totalGeral.consumido)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Global</CardTitle></CardHeader>
          <CardContent><div className={`text-xl font-bold ${totalGeral.saldo < 0 ? "text-destructive" : "text-emerald-600"}`}>{formatBRL(totalGeral.saldo)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">% Consumido</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalGeral.pct.toFixed(1)}%</div>
            <Progress value={Math.min(totalGeral.pct, 100)} className={`mt-2 ${totalGeral.pct > 100 ? "[&>div]:bg-destructive" : ""}`} />
          </CardContent>
        </Card>
      </div>

      {/* Gráfico: Cota vs Consumido por Regional — visível para admin/nacional */}
      {showFullDashboard && consolidado.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma cota orçamentária cadastrada para {exercicio}.</CardContent></Card>
      )}

      {showFullDashboard && consolidado.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Cota vs Consumido por Regional</CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Ordenar:</span>
              {([
                { key: "sigla", label: "A-Z" },
                 { key: "dotacaoTotal", label: "Cota" },
                 { key: "totalConsumido", label: "Consumido" },
              ] as const).map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={sortChart1 === opt.key ? "default" : "outline"}
                  className="h-7 text-xs px-2"
                  onClick={() => setSortChart1(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...consolidado].sort((a, b) =>
                    sortChart1 === "sigla"
                      ? a.sigla.localeCompare(b.sigla)
                      : b[sortChart1] - a[sortChart1]
                  )}
                  margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="sigla" angle={-45} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tickFormatter={shortBRL} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="dotacaoTotal" name="Cota" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalConsumido" name="Consumido" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de consumo por delegacia */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Consumido por Delegacia</CardTitle></CardHeader>
        <CardContent>
          {consumoPorDelegacia.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum consumo registrado por delegacia em {exercicio}.</p>
          ) : (
            <div style={{ height: Math.max(300, consumoPorDelegacia.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consumoPorDelegacia}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={shortBRL} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={150} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="total" name="Consumido" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de consumo por UOP */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Consumido por UOP</CardTitle></CardHeader>
        <CardContent>
          {consumoPorUOP.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum consumo registrado por UOP em {exercicio}.</p>
          ) : (
            <div style={{ height: Math.max(300, consumoPorUOP.length * 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consumoPorUOP.slice(0, 30)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={shortBRL} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 9 }} width={180} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="total" name="Consumido" fill="hsl(var(--chart-2, 340 75% 55%))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {consumoPorUOP.length > 30 && (
            <p className="text-xs text-muted-foreground text-center mt-2">Exibindo top 30 de {consumoPorUOP.length} UOPs.</p>
          )}
        </CardContent>
      </Card>

      {/* Gráficos adicionais — apenas para admin/nacional */}
      {showFullDashboard && consolidado.length > 0 && (
        <>

          <Card>
            <CardHeader><CardTitle className="text-lg">Utilização da Cota por Regional</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {consolidado.map((item) => (
                  <div key={item.sigla} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{item.sigla}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatBRL(item.totalConsumido)} / {formatBRL(item.dotacaoTotal)}</span>
                        <span className={`font-semibold ${item.percentual > 100 ? "text-destructive" : item.percentual > 80 ? "text-orange-500" : "text-emerald-600"}`}>
                          {item.percentual.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(item.percentual, 100)}
                      className={`h-3 ${item.percentual > 100 ? "[&>div]:bg-destructive" : item.percentual > 80 ? "[&>div]:bg-orange-500" : ""}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
