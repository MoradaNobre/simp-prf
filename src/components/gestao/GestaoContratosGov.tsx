import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monitoredInvoke } from "@/utils/monitoredInvoke";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Download, CheckCircle2, XCircle, Clock, Globe, Zap, ZapOff, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useUasgRegionalMapping,
  useActivateGovContract,
  useActivateGovContractsBulk,
} from "@/hooks/useActivateGovContract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function GestaoContratosGov() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"imports" | "logs">("imports");
  const [selectedRegionalOverride, setSelectedRegionalOverride] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState("");
  const [filterUasg, setFilterUasg] = useState<string>("todos");
  const [filterSituacao, setFilterSituacao] = useState<string>("todos");
  const [filterSimp, setFilterSimp] = useState<string>("todos");

  const { data: mapping } = useUasgRegionalMapping();
  const activateMutation = useActivateGovContract();
  const bulkMutation = useActivateGovContractsBulk();

  // Fetch imported contracts
  const { data: imports, isLoading: loadingImports } = useQuery({
    queryKey: ["contratos-gov-import"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_gov_import" as any)
        .select("*")
        .order("atualizado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch regionais for manual override select
  const { data: regionais } = useQuery({
    queryKey: ["regionais-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regionais")
        .select("id, sigla, nome")
        .order("sigla");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sync logs
  const { data: syncLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["contratos-gov-sync-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_gov_sync_log" as any)
        .select("*")
        .order("iniciado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  // Trigger sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await monitoredInvoke("sync-contratos-gov", { maxRetries: 0 });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Sincronização concluída! ${data?.total_importados ?? 0} contratos importados.`
      );
      qc.invalidateQueries({ queryKey: ["contratos-gov-import"] });
      qc.invalidateQueries({ queryKey: ["contratos-gov-sync-log"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao iniciar sincronização: " + (err?.message || "Erro desconhecido"));
    },
  });

  // Export to JSON
  const handleExport = () => {
    if (!imports?.length) return;
    const blob = new Blob([JSON.stringify(imports, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contratos_gov_prf_${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleActivateOne = (imp: any) => {
    const overrideRegional = selectedRegionalOverride[imp.id];
    const autoRegional = mapping?.[imp.uasg_codigo]?.regional_id;
    const regionalId = overrideRegional || autoRegional;

    if (!regionalId) {
      toast.error("Selecione a regional para este contrato antes de ativar.");
      return;
    }

    activateMutation.mutate(
      { govImport: imp, regionalId },
      {
        onSuccess: () => toast.success(`Contrato ${imp.numero} ativado no SIMP!`),
        onError: (err: any) => toast.error(`Erro: ${err.message}`),
      }
    );
  };

  const handleActivateAll = () => {
    if (!imports?.length || !mapping) return;
    const pending = imports.filter((i: any) => !i.contrato_simp_id);
    if (pending.length === 0) {
      toast.info("Todos os contratos já foram ativados.");
      return;
    }
    bulkMutation.mutate({ imports: pending, mapping });
  };

  const pendingCount = imports?.filter((i: any) => !i.contrato_simp_id).length ?? 0;
  const activatedCount = imports?.filter((i: any) => i.contrato_simp_id).length ?? 0;

  // Unique UASG codes for filter
  const uasgOptions = useMemo(() => {
    if (!imports?.length) return [];
    const unique = [...new Set(imports.map((i: any) => i.uasg_codigo))].sort();
    return unique.map((code) => ({
      code,
      label: mapping?.[code] ? `${code} (${mapping[code].sigla})` : code,
    }));
  }, [imports, mapping]);

  // Filtered imports
  const filteredImports = useMemo(() => {
    if (!imports) return [];
    return imports.filter((c: any) => {
      if (filterUasg !== "todos" && c.uasg_codigo !== filterUasg) return false;
      if (filterSituacao !== "todos" && (c.situacao || "").toLowerCase() !== filterSituacao) return false;
      if (filterSimp === "pendente" && c.contrato_simp_id) return false;
      if (filterSimp === "ativado" && !c.contrato_simp_id) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const haystack = `${c.numero} ${c.empresa} ${c.objeto || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [imports, filterUasg, filterSituacao, filterSimp, searchText]);

  const filteredPendingCount = filteredImports.filter((i: any) => !i.contrato_simp_id).length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "concluido_com_erros":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><XCircle className="h-3 w-3 mr-1" />Com Erros</Badge>;
      case "erro":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Em Andamento</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Importação Contratos.gov.br
          </h3>
          <p className="text-sm text-muted-foreground">
            Coleta automática de contratos de manutenção predial da PRF via API ComprasNet
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!imports?.length}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar JSON
          </Button>
          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar Agora"}
          </Button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === "imports" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("imports")}
        >
          Contratos Importados ({filteredImports.length})
        </Button>
        <Button
          variant={activeTab === "logs" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("logs")}
        >
          Histórico de Sync ({syncLogs?.length ?? 0})
        </Button>
        {filteredPendingCount > 0 && activeTab === "imports" && (
          <Button
            size="sm"
            variant="default"
            className="ml-auto"
            onClick={handleActivateAll}
            disabled={bulkMutation.isPending}
          >
            {bulkMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            Ativar Todos ({filteredPendingCount})
          </Button>
        )}
      </div>

      {activeTab === "imports" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar número, empresa, objeto..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-9 w-[250px]"
              />
            </div>
            <Select value={filterUasg} onValueChange={setFilterUasg}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="UASG / Regional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas UASGs</SelectItem>
                {uasgOptions.map((u) => (
                  <SelectItem key={u.code} value={u.code}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSituacao} onValueChange={setFilterSituacao}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Situações</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSimp} onValueChange={setFilterSimp}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Status SIMP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="ativado">Ativados</SelectItem>
              </SelectContent>
            </Select>
            {(searchText || filterUasg !== "todos" || filterSituacao !== "todos" || filterSimp !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchText(""); setFilterUasg("todos"); setFilterSituacao("todos"); setFilterSimp("todos"); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {activatedCount > 0 && (
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-green-600" />
              {activatedCount} ativados · {pendingCount} pendentes
              {filteredImports.length !== (imports?.length ?? 0) && (
                <span> · Exibindo {filteredImports.length} de {imports?.length}</span>
              )}
            </p>
          )}
          <div className="border rounded-lg overflow-auto max-h-[500px]">
            {loadingImports ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !imports?.length ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Nenhum contrato importado ainda. Clique em "Sincronizar Agora" para iniciar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UASG</TableHead>
                    <TableHead>Regional</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="hidden lg:table-cell">Objeto</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead className="text-right">Valor Global</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>SIMP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((c: any) => {
                    const autoRegional = mapping?.[c.uasg_codigo];
                    const isActivated = !!c.contrato_simp_id;
                    return (
                      <TableRow key={c.id} className={isActivated ? "opacity-60" : ""}>
                        <TableCell className="font-mono text-xs">{c.uasg_codigo}</TableCell>
                        <TableCell className="text-xs">
                          {isActivated ? (
                            <span className="text-muted-foreground">{autoRegional?.sigla || "—"}</span>
                          ) : autoRegional ? (
                            <span>{autoRegional.sigla}</span>
                          ) : (
                            <Select
                              value={selectedRegionalOverride[c.id] || ""}
                              onValueChange={(v) =>
                                setSelectedRegionalOverride((prev) => ({ ...prev, [c.id]: v }))
                              }
                            >
                              <SelectTrigger className="h-7 w-[120px] text-xs">
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {regionais?.map((r) => (
                                  <SelectItem key={r.id} value={r.id} className="text-xs">
                                    {r.sigla}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{c.numero}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{c.empresa}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs max-w-[200px] truncate">
                          {c.objeto || "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {c.vigencia_inicio
                            ? format(new Date(c.vigencia_inicio), "dd/MM/yy")
                            : "—"}{" "}
                          a{" "}
                          {c.vigencia_fim
                            ? format(new Date(c.vigencia_fim), "dd/MM/yy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">{fmt(c.valor_global || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={c.situacao === "Ativo" ? "default" : "secondary"} className="text-xs">
                            {c.situacao || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isActivated ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleActivateOne(c)}
                              disabled={activateMutation.isPending}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Ativar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {activeTab === "logs" && (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          {loadingLogs ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !syncLogs?.length ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              Nenhuma sincronização realizada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">UASGs</TableHead>
                  <TableHead className="text-right">Contratos</TableHead>
                  <TableHead className="text-right">Importados</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log: any) => {
                  const duracao =
                    log.finalizado_em && log.iniciado_em
                      ? Math.round(
                          (new Date(log.finalizado_em).getTime() -
                            new Date(log.iniciado_em).getTime()) /
                            1000
                        )
                      : null;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.iniciado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="text-right">{log.total_uasgs}</TableCell>
                      <TableCell className="text-right">{log.total_contratos}</TableCell>
                      <TableCell className="text-right">{log.total_importados}</TableCell>
                      <TableCell className="text-right">{log.total_erros}</TableCell>
                      <TableCell className="text-xs">
                        {duracao !== null ? `${duracao}s` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
