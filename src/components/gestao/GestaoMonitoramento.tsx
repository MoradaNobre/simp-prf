import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, TrendingDown, TrendingUp, Zap, Settings2, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type LogEntry = {
  id: string;
  function_name: string;
  status_code: number;
  success: boolean;
  latency_ms: number;
  error_message: string | null;
  created_at: string;
};

type FunctionStats = {
  name: string;
  total: number;
  successes: number;
  failures: number;
  successRate: number;
  avgLatency: number;
  maxLatency: number;
  lastError: string | null;
  lastCall: string;
};

const COLORS = ["#16a34a", "#dc2626", "#2563eb", "#ca8a04", "#9333ea", "#0891b2", "#e11d48", "#65a30d"];

export default function GestaoMonitoramento() {
  const qc = useQueryClient();
  const [timeRange, setTimeRange] = useState("24h");
  const [showConfig, setShowConfig] = useState(false);

  const getTimeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case "1h": return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case "6h": return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["edge_function_logs", timeRange],
    queryFn: async () => {
      const since = getTimeFilter();
      const { data, error } = await supabase
        .from("edge_function_logs" as any)
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as LogEntry[];
    },
    refetchInterval: 30000,
  });

  const { data: configData } = useQuery({
    queryKey: ["monitoring_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitoring_config" as any)
        .select("config_key, config_value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.config_key] = r.config_value; });
      return map;
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("monitoring_config" as any)
        .update({ config_value: value, updated_at: new Date().toISOString() } as any)
        .eq("config_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitoring_config"] });
      toast.success("Configuração atualizada");
    },
  });

  const runHealthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-function-health");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.status === "healthy") toast.success("Todas as funções estão saudáveis");
      else if (data.status === "alert") toast.warning(`${data.alerts.length} função(ões) com alerta`);
      else toast.info(data.status);
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  // Compute stats
  const stats: FunctionStats[] = (() => {
    const map: Record<string, LogEntry[]> = {};
    logs.forEach(l => {
      if (!map[l.function_name]) map[l.function_name] = [];
      map[l.function_name].push(l);
    });
    return Object.entries(map).map(([name, entries]) => {
      const successes = entries.filter(e => e.success).length;
      const failures = entries.length - successes;
      const latencies = entries.map(e => e.latency_ms);
      const lastError = entries.find(e => !e.success)?.error_message || null;
      return {
        name,
        total: entries.length,
        successes,
        failures,
        successRate: entries.length > 0 ? Math.round((successes / entries.length) * 100) : 100,
        avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
        lastError,
        lastCall: entries[0]?.created_at || "",
      };
    }).sort((a, b) => a.successRate - b.successRate);
  })();

  const totalCalls = logs.length;
  const totalFailures = logs.filter(l => !l.success).length;
  const globalSuccessRate = totalCalls > 0 ? Math.round(((totalCalls - totalFailures) / totalCalls) * 100) : 100;
  const avgLatency = totalCalls > 0 ? Math.round(logs.reduce((s, l) => s + l.latency_ms, 0) / totalCalls) : 0;

  // Chart data
  const pieData = [
    { name: "Sucesso", value: totalCalls - totalFailures },
    { name: "Falha", value: totalFailures },
  ];

  const barData = stats.map(s => ({
    name: s.name.replace(/-/g, "\n"),
    Sucesso: s.successes,
    Falha: s.failures,
  }));

  const latencyData = stats.map(s => ({
    name: s.name.replace(/-/g, "\n"),
    "Média (ms)": s.avgLatency,
    "Máximo (ms)": s.maxLatency,
  }));

  const threshold = parseInt(configData?.alert_threshold_percent || "20", 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitoramento de Edge Functions
          </h2>
          <p className="text-sm text-muted-foreground">Taxa de sucesso, latência e alertas em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="6h">6 horas</SelectItem>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["edge_function_logs"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => runHealthCheck.mutate()} disabled={runHealthCheck.isPending}>
            <Send className="h-4 w-4 mr-1" />
            Verificar Saúde
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Chamadas</p>
                <p className="text-2xl font-bold">{totalCalls}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                <p className={`text-2xl font-bold ${globalSuccessRate >= 80 ? "text-green-600" : globalSuccessRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {globalSuccessRate}%
                </p>
              </div>
              {globalSuccessRate >= 80 ? <TrendingUp className="h-8 w-8 text-green-200" /> : <TrendingDown className="h-8 w-8 text-red-200" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Falhas</p>
                <p className={`text-2xl font-bold ${totalFailures > 0 ? "text-red-600" : ""}`}>{totalFailures}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Latência Média</p>
                <p className="text-2xl font-bold">{avgLatency}<span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config panel */}
      {showConfig && configData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuração de Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Alerta Ativo</Label>
                <div className="mt-1">
                  <Switch
                    checked={configData.alert_enabled !== "false"}
                    onCheckedChange={(v) => updateConfig.mutate({ key: "alert_enabled", value: v ? "true" : "false" })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Limiar de Falha (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={configData.alert_threshold_percent || "20"}
                  className="mt-1"
                  onBlur={(e) => updateConfig.mutate({ key: "alert_threshold_percent", value: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Janela de Análise (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  defaultValue={configData.alert_check_window_minutes || "60"}
                  className="mt-1"
                  onBlur={(e) => updateConfig.mutate({ key: "alert_check_window_minutes", value: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">E-mails para Alerta (separados por vírgula)</Label>
              <Input
                defaultValue={(() => {
                  try { return JSON.parse(configData.alert_email_recipients || "[]").join(", "); } catch { return ""; }
                })()}
                placeholder="admin@prf.gov.br, gestor@prf.gov.br"
                className="mt-1"
                onBlur={(e) => {
                  const emails = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                  updateConfig.mutate({ key: "alert_email_recipients", value: JSON.stringify(emails) });
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {totalCalls > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chamadas por Função</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Sucesso" stackId="a" fill="#16a34a" />
                  <Bar dataKey="Falha" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Latência por Função (ms)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={latencyData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Média (ms)" fill="#2563eb" />
                  <Bar dataKey="Máximo (ms)" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Function table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status por Função</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : stats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro no período selecionado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-center">Chamadas</TableHead>
                  <TableHead className="text-center">Taxa de Sucesso</TableHead>
                  <TableHead className="text-center">Latência Média</TableHead>
                  <TableHead className="text-center">Lat. Máxima</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map(s => (
                  <TableRow key={s.name}>
                    <TableCell className="font-mono text-xs">{s.name}</TableCell>
                    <TableCell className="text-center">{s.total}</TableCell>
                    <TableCell className="text-center">
                      <span className={s.successRate >= 80 ? "text-green-600 font-semibold" : s.successRate >= 50 ? "text-yellow-600 font-semibold" : "text-red-600 font-semibold"}>
                        {s.successRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{s.avgLatency}ms</TableCell>
                    <TableCell className="text-center">{s.maxLatency}ms</TableCell>
                    <TableCell>
                      {s.successRate >= (100 - threshold) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Saudável
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />Alerta
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent errors */}
      {logs.filter(l => !l.success).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Erros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latência</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.filter(l => !l.success).slice(0, 20).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.function_name}</TableCell>
                    <TableCell><Badge variant="destructive">{l.status_code}</Badge></TableCell>
                    <TableCell>{l.latency_ms}ms</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{l.error_message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
