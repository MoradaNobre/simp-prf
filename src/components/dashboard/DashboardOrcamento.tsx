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
}

export default function DashboardOrcamento({ regionalId }: DashboardOrcamentoProps) {
  const [exercicio, setExercicio] = useState(currentYear);
  const [sortChart1, setSortChart1] = useState<"sigla" | "dotacaoTotal" | "totalConsumido">("sigla");

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

      {/* KPIs globais */}
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

      {consolidado.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma cota orçamentária cadastrada para {exercicio}.</CardContent></Card>
      ) : (
        <>
          {/* Gráfico 1: Dotação vs Consumido */}
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

          {/* Gráfico 2: Barras empilhadas - Custos OS + Empenhos */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Composição do Consumo por Regional</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consolidado} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="sigla" angle={-45} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tickFormatter={shortBRL} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="totalCustosOS" name="Custos OS" stackId="consumo" fill="hsl(var(--chart-1, 220 70% 50%))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="totalEmpenhos" name="Empenhos Manuais" stackId="consumo" fill="hsl(var(--chart-2, 340 75% 55%))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 3: Progresso por Regional */}
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
