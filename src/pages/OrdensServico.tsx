import { useState, useMemo } from "react";
import { isAdminRole, isFiscalRole, isGlobalRole } from "@/utils/roles";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Pencil, Trash2, CalendarIcon, ArrowUp, ArrowDown, ArrowUpDown, Info, Filter, RefreshCw, Phone } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrdensServico, useDeleteOS, type OrdemServico } from "@/hooks/useOrdensServico";
import { useUserRole } from "@/hooks/useUserRole";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { NovaOSDialog } from "@/components/os/NovaOSDialog";
import { EditarOSDialog } from "@/components/os/EditarOSDialog";
import { DetalhesOSDialog } from "@/components/os/DetalhesOSDialog";
import { OSCardMobile } from "@/components/os/OSCardMobile";
import { useIsMobile } from "@/hooks/use-mobile";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  orcamento: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  autorizacao: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  execucao: "bg-accent text-accent-foreground",
  ateste: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  faturamento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pagamento: "bg-success text-success-foreground",
  encerrada: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguardando Autorização",
  execucao: "Execução", ateste: "Ateste", faturamento: "Faturamento", pagamento: "Pagamento", encerrada: "Encerrada",
};
const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

const prioridadeOrder: Record<string, number> = { baixa: 0, media: 1, alta: 2, urgente: 3 };
const statusOrder: Record<string, number> = {
  aberta: 0, orcamento: 1, autorizacao: 2, execucao: 3, ateste: 4, faturamento: 5, pagamento: 6, encerrada: 7,
};

type SortKey = "codigo" | "titulo" | "solicitante" | "preposto" | "regional" | "delegacia" | "unidade" | "valor" | "status" | "prioridade" | "data";
type SortDir = "asc" | "desc";

function getOSSortValue(os: OrdemServico, key: SortKey): string | number {
  const uop = os.uops as any;
  const delegacia = uop?.delegacias;
  const regional = os.regionais || delegacia?.regionais;
  switch (key) {
    case "codigo": return os.codigo;
    case "titulo": return os.titulo.toLowerCase();
    case "solicitante": return (os.solicitante_profile?.full_name ?? "").toLowerCase();
    case "preposto": return ((os.contratos as any)?.preposto_nome ?? "").toLowerCase();
    case "regional": return regional?.sigla?.toLowerCase() ?? "";
    case "delegacia": return delegacia?.nome?.toLowerCase() ?? "";
    case "unidade": return uop?.nome?.toLowerCase() ?? "";
    case "valor": return Number((os as any).valor_orcamento) || 0;
    case "status": return statusOrder[os.status] ?? 99;
    case "prioridade": return prioridadeOrder[os.prioridade] ?? 99;
    case "data": return new Date(os.data_abertura).getTime();
    default: return "";
  }
}

export default function OrdensServico() {
  const { data: role } = useUserRole();
  const isMobile = useIsMobile();
  const canManage = role && !["operador", "preposto", "terceirizado"].includes(role);
  const canDeleteOS = isGlobalRole(role);
  const isExternalUser = role === "preposto" || role === "terceirizado";
  const canCreateOS = role && !isExternalUser;
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const [statusFilter, setStatusFilter] = useState("");
  const [prioridadeFilter, setPrioridadeFilter] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [novaOSOpen, setNovaOSOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [editOS, setEditOS] = useState<OrdemServico | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deleteOS = useDeleteOS();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteOS.mutateAsync(deleteId);
      toast.success("OS excluída com sucesso");
    } catch {
      toast.error("Erro ao excluir OS");
    }
    setDeleteId(null);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const { data: ordensRaw, isLoading, refetch, isFetching } = useOrdensServico({
    status: statusFilter || undefined,
    prioridade: prioridadeFilter || undefined,
    search: search || undefined,
    regionalId: effectiveRegionalId,
  });

  // Client-side date filter + sort
  const ordens = useMemo(() => {
    let filtered = ordensRaw?.filter((os) => {
      const osDate = new Date(os.data_abertura);
      if (dataInicio && osDate < dataInicio) return false;
      if (dataFim) {
        const fimEnd = new Date(dataFim);
        fimEnd.setHours(23, 59, 59, 999);
        if (osDate > fimEnd) return false;
      }
      return true;
    });

    if (filtered && sortKey) {
      filtered = [...filtered].sort((a, b) => {
        const va = getOSSortValue(a, sortKey);
        const vb = getOSSortValue(b, sortKey);
        let cmp = 0;
        if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else cmp = String(va).localeCompare(String(vb), "pt-BR");
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return filtered;
  }, [ordensRaw, dataInicio, dataFim, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie todas as OS
            {ordens && <span className="ml-1">({ordens.length})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} title="Atualizar">
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          {isMobile && (
            <Button variant="outline" size="icon" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="h-4 w-4" />
            </Button>
          )}
          {canCreateOS && (
            <Button onClick={() => setNovaOSOpen(true)} size={isMobile ? "icon" : "default"}>
              <Plus className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
              {!isMobile && "Nova OS"}
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap",
        isMobile && !filtersOpen && "hidden"
      )}>
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar OS..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Constants.public.Enums.os_status.map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prioridadeFilter || "all"} onValueChange={(v) => setPrioridadeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Prioridades</SelectItem>
              {Constants.public.Enums.os_prioridade.map((p) => (
                <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canFilterRegional && (
            <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[140px] justify-start text-left font-normal text-xs", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[140px] justify-start text-left font-normal text-xs", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
              Limpar datas
            </Button>
          )}
        </div>
      </div>

      {(role === "gestor_regional" || isAdminRole(role) || isFiscalRole(role)) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Status que requerem sua ação:</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["aberta"]}`}>
                    Aberta
                  </span>
                  <span className="text-xs text-muted-foreground">— Vincular contrato e encaminhar para orçamento</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["autorizacao"]}`}>
                    Aguardando Autorização
                  </span>
                  <span className="text-xs text-muted-foreground">— Aprovar ou restituir o orçamento para execução</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["ateste"]}`}>
                    Ateste
                  </span>
                  <span className="text-xs text-muted-foreground">— Validar a execução e autorizar emissão da NF</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["pagamento"]}`}>
                    Pagamento
                  </span>
                  <span className="text-xs text-muted-foreground">— Verificar NF/certidões e encerrar a OS</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isExternalUser && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Status que requerem sua ação:</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["orcamento"]}`}>
                    Orçamento
                  </span>
                  <span className="text-xs text-muted-foreground">— Enviar orçamento e valor estimado</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["execucao"]}`}>
                    Execução
                  </span>
                  <span className="text-xs text-muted-foreground">— Realizar o serviço e registrar evidências (fotos antes/depois)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors["faturamento"]}`}>
                    Faturamento
                  </span>
                  <span className="text-xs text-muted-foreground">— Enviar nota fiscal emitida e certidões exigidas</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !ordens?.length ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground text-sm">
            {isExternalUser
              ? "Nenhuma OS vinculada ao seu contrato no momento."
              : "Nenhuma OS encontrada. Crie uma nova OS para começar."}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <>
          <div className="space-y-3">
            {ordens.map((os) => (
              <OSCardMobile
                key={os.id}
                os={os}
                canManage={!!canManage}
                canDelete={canDeleteOS}
                onSelect={setSelectedOS}
                onEdit={setEditOS}
                onDelete={setDeleteId}
              />
            ))}
          </div>
          <Card>
            <CardContent className="py-3 px-4 text-sm font-semibold flex justify-between">
              <span>Total:</span>
              <span>R$ {ordens.reduce((sum, os) => sum + (Number((os as any).valor_orcamento) || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {([
                    ["codigo", "Código"],
                    ["titulo", "Título"],
                    ["solicitante", "Solicitante"],
                    ["preposto", "Preposto"],
                    ["regional", "Regional"],
                    ["delegacia", "Delegacia"],
                    ["unidade", "Unidade"],
                    ["valor", "Valor"],
                    ["status", "Status"],
                    ["prioridade", "Prioridade"],
                    ["data", "Data"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => toggleSort(key)}
                    >
                      <span className="flex items-center">
                        {label}
                        <SortIcon col={key} />
                      </span>
                    </TableHead>
                  ))}
                  {canManage && <TableHead className="w-20">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((os) => {
                  const uop = os.uops as any;
                  const delegacia = uop?.delegacias;
                  const regional = os.regionais || delegacia?.regionais;
                  return (
                  <TableRow key={os.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOS(os)}>
                    <TableCell className="font-mono text-sm">{os.codigo}</TableCell>
                    <TableCell>{os.titulo}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div>{os.solicitante_profile?.full_name || "—"}</div>
                      {os.solicitante_profile?.phone && (
                        <a
                          href={`https://wa.me/55${os.solicitante_profile.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-0.5 hover:underline mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {os.solicitante_profile.phone.length === 11
                            ? `(${os.solicitante_profile.phone.slice(0, 2)}) ${os.solicitante_profile.phone.slice(2, 7)}-${os.solicitante_profile.phone.slice(7)}`
                            : os.solicitante_profile.phone.length === 10
                              ? `(${os.solicitante_profile.phone.slice(0, 2)}) ${os.solicitante_profile.phone.slice(2, 6)}-${os.solicitante_profile.phone.slice(6)}`
                              : os.solicitante_profile.phone}
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(os.contratos as any)?.preposto_nome ? (
                        <div>
                          <div>{(os.contratos as any).preposto_nome}</div>
                          {(os.contratos as any).preposto_telefone && (
                            <a
                              href={`https://wa.me/55${(os.contratos as any).preposto_telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-0.5 hover:underline mt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {((p) => p.length === 11
                                ? `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`
                                : p.length === 10
                                  ? `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`
                                  : p)((os.contratos as any).preposto_telefone)}
                            </a>
                          )}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{regional?.sigla || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{delegacia?.nome || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{uop?.nome || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(os as any).valor_orcamento > 0
                        ? `R$ ${Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[os.status] || "bg-muted text-muted-foreground"}`}>
                          {statusLabels[os.status] || os.status}
                        </span>
                        {os.motivo_restituicao && (
                          <span className="inline-flex items-center justify-center rounded-full h-5 w-5 text-[10px] font-bold bg-destructive text-destructive-foreground" title={`Restituída: ${os.motivo_restituicao}`}>
                            R
                          </span>
                        )}
                        {os.status === "pagamento" && ((os as any).documentos_pagamento as any[])?.length > 0 && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Aguardando Pagamento
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prioridadeColors[os.prioridade] as any}>
                        {os.prioridade.charAt(0).toUpperCase() + os.prioridade.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(os.data_abertura).toLocaleDateString("pt-BR")} {new Date(os.data_abertura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" title="Editar OS" onClick={() => setEditOS(os)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDeleteOS && (
                            <Button size="icon" variant="ghost" title="Excluir OS" onClick={() => setDeleteId(os.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={7} className="text-right text-sm">Total:</TableCell>
                  <TableCell className="text-sm">
                    R$ {ordens.reduce((sum, os) => sum + (Number((os as any).valor_orcamento) || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell colSpan={canManage ? 4 : 3} />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NovaOSDialog open={novaOSOpen} onOpenChange={setNovaOSOpen} />
      <DetalhesOSDialog os={selectedOS} open={!!selectedOS} onOpenChange={(o) => { if (!o) setSelectedOS(null); }} />
      <EditarOSDialog os={editOS} open={!!editOS} onOpenChange={(o) => { if (!o) setEditOS(null); }} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ordem de Serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A OS e seus custos associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}