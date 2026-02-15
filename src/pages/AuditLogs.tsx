import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollText, Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

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

export default function AuditLogs() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const isMobile = useIsMobile();
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: logs, isLoading } = useAuditLogs(actionFilter, tableFilter);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "gestor_nacional") {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = (logs || []).filter((log) =>
    search
      ? log.description?.toLowerCase().includes(search.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-5 w-5 sm:h-6 sm:w-6" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground text-sm">Histórico de ações críticas</p>
        </div>
        {isMobile && (
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="p-2 rounded-md border border-border">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
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
                  <Badge variant={actionColors[log.action] as any} className="text-[10px]">
                    {actionLabels[log.action] || log.action}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
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
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => (
              <TableRow key={log.id}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
