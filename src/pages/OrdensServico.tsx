import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
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
import { Constants } from "@/integrations/supabase/types";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  triagem: "bg-warning text-warning-foreground",
  execucao: "bg-accent text-accent-foreground",
  encerrada: "bg-success text-success-foreground",
};
const statusLabels: Record<string, string> = {
  aberta: "Aberta", triagem: "Triagem", execucao: "Em Execução", encerrada: "Encerrada",
};
const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

export default function OrdensServico() {
  const { data: role } = useUserRole();
  const canManage = role && role !== "operador";
  const { isNacional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [prioridadeFilter, setPrioridadeFilter] = useState("");
  const [novaOSOpen, setNovaOSOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [editOS, setEditOS] = useState<OrdemServico | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const { data: ordens, isLoading } = useOrdensServico({
    status: statusFilter || undefined,
    prioridade: prioridadeFilter || undefined,
    search: search || undefined,
    regionalId: effectiveRegionalId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">
            Gerencie todas as OS de manutenção
            {ordens && <span className="ml-1">({ordens.length} registros)</span>}
          </p>
        </div>
        <Button onClick={() => setNovaOSOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova OS
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar OS..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Constants.public.Enums.os_status.map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridadeFilter || "all"} onValueChange={(v) => setPrioridadeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Constants.public.Enums.os_prioridade.map((p) => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isNacional && (
          <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !ordens?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma OS encontrada. Crie uma nova OS para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                  {canManage && <TableHead className="w-20">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((os) => (
                  <TableRow key={os.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOS(os)}>
                    <TableCell className="font-mono text-sm">{os.codigo}</TableCell>
                    <TableCell>{os.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">{(os.uops as any)?.nome || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[os.status]}`}>
                        {statusLabels[os.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prioridadeColors[os.prioridade] as any}>
                        {os.prioridade.charAt(0).toUpperCase() + os.prioridade.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(os.data_abertura).toLocaleDateString("pt-BR")}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" title="Editar OS" onClick={() => setEditOS(os)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Excluir OS" onClick={() => setDeleteId(os.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
