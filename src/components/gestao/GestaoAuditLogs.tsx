import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, Filter, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const actionLabels: Record<string, string> = {
  DELETE: "Exclusão",
  STATUS_CHANGE: "Mudança de Status",
  ROLE_CHANGE: "Mudança de Papel",
  RESPONSAVEL_CHANGE: "Mudança de Responsável",
};

const actionColors: Record<string, string> = {
  DELETE: "destructive",
  STATUS_CHANGE: "default",
  ROLE_CHANGE: "secondary",
  RESPONSAVEL_CHANGE: "outline",
};

const tableLabels: Record<string, string> = {
  ordens_servico: "Ordens de Serviço",
  contratos: "Contratos",
  regionais: "Regionais",
  delegacias: "Delegacias",
  uops: "UOPs",
  user_roles: "Papéis de Usuário",
};

function useAuditLogs(actionFilter: string, tableFilter: string) {
  return useQuery({
    queryKey: ["audit-logs", actionFilter, tableFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter && actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (tableFilter && tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((l) => l.user_id).filter(Boolean))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profiles || []).forEach((p) => profileMap.set(p.user_id, p.full_name));
      }

      return (data || []).map((log) => ({
        ...log,
        user_name: log.user_id ? profileMap.get(log.user_id) || "Desconhecido" : "Sistema",
      })) as Array<typeof data[number] & { user_name: string }>;
    },
  });
}

export default function GestaoAuditLogs() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<"single" | "selected" | "all" | null>(null);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const { data: logs, isLoading } = useAuditLogs(actionFilter, tableFilter);

  const filtered = (logs || []).filter((log) =>
    search
      ? log.description?.toLowerCase().includes(search.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("audit_logs")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setSelected(new Set());
      toast.success("Logs excluídos com sucesso.");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // Delete all visible logs (respects current filters)
      const ids = filtered.map((l) => l.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from("audit_logs")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setSelected(new Set());
      toast.success("Todos os logs foram excluídos.");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const handleConfirmDelete = () => {
    if (confirmDelete === "single" && singleDeleteId) {
      deleteMutation.mutate([singleDeleteId]);
    } else if (confirmDelete === "selected") {
      deleteMutation.mutate(Array.from(selected));
    } else if (confirmDelete === "all") {
      deleteAllMutation.mutate();
    }
    setConfirmDelete(null);
    setSingleDeleteId(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  };

  const isDeleting = deleteMutation.isPending || deleteAllMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">Histórico de ações críticas</p>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete("selected")}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir ({selected.size})
            </Button>
          )}
          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete("all")}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir todos
            </Button>
          )}
          {isMobile && (
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="p-2 rounded-md border border-border">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 ${isMobile && !filtersOpen ? "hidden" : ""}`}>
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na descrição..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isMobile && <Filter className="h-4 w-4 text-muted-foreground" />}
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo de ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
              <SelectItem value="STATUS_CHANGE">Mudança de Status</SelectItem>
              <SelectItem value="ROLE_CHANGE">Mudança de Papel</SelectItem>
              <SelectItem value="RESPONSAVEL_CHANGE">Mudança de Responsável</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              <SelectItem value="ordens_servico">Ordens de Serviço</SelectItem>
              <SelectItem value="contratos">Contratos</SelectItem>
              <SelectItem value="regionais">Regionais</SelectItem>
              <SelectItem value="delegacias">Delegacias</SelectItem>
              <SelectItem value="uops">UOPs</SelectItem>
              <SelectItem value="user_roles">Papéis de Usuário</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum log encontrado.
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(log.id)}
                      onCheckedChange={() => toggleSelect(log.id)}
                    />
                    <Badge variant={actionColors[log.action] as any} className="text-[10px]">
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setSingleDeleteId(log.id); setConfirmDelete("single"); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs">
                  <span className="font-medium">{log.user_name}</span>
                  <span className="text-muted-foreground"> · {tableLabels[log.table_name] || log.table_name}</span>
                </div>
                {log.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{log.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-16">Excluir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(log.id)}
                    onCheckedChange={() => toggleSelect(log.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={actionColors[log.action] as any}>
                    {actionLabels[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {log.user_name}
                </TableCell>
                <TableCell className="text-sm">
                  {tableLabels[log.table_name] || log.table_name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                  {log.description || "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setSingleDeleteId(log.id); setConfirmDelete("single"); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) { setConfirmDelete(null); setSingleDeleteId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === "all"
                ? `Deseja excluir todos os ${filtered.length} logs exibidos? Esta ação não pode ser desfeita.`
                : confirmDelete === "selected"
                ? `Deseja excluir os ${selected.size} logs selecionados? Esta ação não pode ser desfeita.`
                : "Deseja excluir este log? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
