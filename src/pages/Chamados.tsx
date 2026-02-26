import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, PackagePlus, Trash2, Eye } from "lucide-react";
import { NovoChamadoDialog } from "@/components/chamados/NovoChamadoDialog";
import { useChamados, useUpdateChamado, useDeleteChamado, type Chamado } from "@/hooks/useChamados";
import { useCreateOS } from "@/hooks/useOrdensServico";
import { useUserRole } from "@/hooks/useUserRole";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { isAdminRole } from "@/utils/roles";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  hidraulico: "Sistema Hidráulico",
  eletrico: "Sistema Elétrico",
  iluminacao: "Iluminação",
  incendio: "Incêndio",
  estrutura: "Estrutura",
  rede_logica: "Rede Lógica",
  elevadores: "Elevadores",
  ar_condicionado: "Ar Condicionado",
  instalacoes_diversas: "Instalações Diversas",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  vinculado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "secondary",
  media: "default",
  alta: "warning",
  urgente: "destructive",
};

export default function Chamados() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { selectedRegionalId: regionalId, setSelectedRegionalId: setRegionalId } = useRegionalFilter();
  const isGestor = isAdminRole(role) || role === "gestor_regional";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("aberto");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChamados, setSelectedChamados] = useState<Set<string>>(new Set());
  const [viewChamado, setViewChamado] = useState<Chamado | null>(null);
  const [creatingOS, setCreatingOS] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: chamados = [], isLoading } = useChamados({
    status: statusFilter || undefined,
    regionalId,
    search: search || undefined,
  });

  const createOS = useCreateOS();
  const updateChamado = useUpdateChamado();
  const deleteChamado = useDeleteChamado();

  const toggleSelect = (id: string) => {
    setSelectedChamados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateOSFromChamados = async () => {
    if (selectedChamados.size === 0 || !user) return;
    setCreatingOS(true);
    try {
      const selected = chamados.filter(c => selectedChamados.has(c.id) && c.status === "aberto");
      if (selected.length === 0) { toast.error("Selecione chamados abertos."); return; }

      // Use first chamado's data as base
      const base = selected[0];
      const tipoLabel = TIPO_LABELS[base.tipo_demanda] || base.tipo_demanda;

      // Build combined description
      const descParts = selected.map((c, i) => {
        const tipoL = TIPO_LABELS[c.tipo_demanda] || c.tipo_demanda;
        return `--- Chamado ${c.codigo} (${tipoL}) ---\nLocal: ${c.local_servico}\n${c.descricao}${c.justificativa_urgente ? `\n[Justificativa urgência]: ${c.justificativa_urgente}` : ""}`;
      });
      const descricaoFinal = descParts.join("\n\n");

      // Determine highest priority
      const prioOrder = ["baixa", "media", "alta", "urgente"];
      const maxPrio = selected.reduce((max, c) => {
        const ci = prioOrder.indexOf(c.prioridade);
        return ci > prioOrder.indexOf(max) ? c.prioridade : max;
      }, "baixa");

      const result = await createOS.mutateAsync({
        titulo: selected.length === 1 ? tipoLabel : `${selected.length} chamados agrupados`,
        descricao: descricaoFinal,
        tipo: "corretiva" as any,
        prioridade: maxPrio as any,
        uop_id: base.uop_id || null,
        contrato_id: null,
        solicitante_id: user.id,
        foto_antes: base.foto || null,
        codigo: "",
        regional_id: base.regional_id || null,
      } as any);

      // Link chamados to OS
      for (const c of selected) {
        await updateChamado.mutateAsync({ id: c.id, os_id: result.id, status: "vinculado" });
      }

      toast.success(`OS criada com ${selected.length} chamado(s)!`);
      setSelectedChamados(new Set());
    } catch (err: any) {
      toast.error("Erro ao criar OS: " + (err.message || err));
    } finally {
      setCreatingOS(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteChamado.mutateAsync(deleteId);
      toast.success("Chamado excluído.");
    } catch (err: any) {
      toast.error("Erro: " + (err.message || err));
    }
    setDeleteId(null);
  };

  const openChamados = chamados.filter(c => c.status === "aberto");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chamados</h1>
          <p className="text-muted-foreground text-sm">Abra chamados de manutenção e agrupe-os em Ordens de Serviço.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Chamado
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar chamados..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="vinculado">Vinculados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <RegionalFilterSelect value={regionalId} onChange={setRegionalId} />
      </div>

      {/* Gestor action bar */}
      {isGestor && selectedChamados.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">{selectedChamados.size} chamado(s) selecionado(s)</span>
          <Button size="sm" onClick={handleCreateOSFromChamados} disabled={creatingOS}>
            {creatingOS ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-2" />}
            Gerar OS
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedChamados(new Set())}>Limpar</Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : chamados.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Nenhum chamado encontrado.</div>
      ) : (
        <div className="space-y-3">
          {chamados.map((chamado) => (
            <Card key={chamado.id} className={`${selectedChamados.has(chamado.id) ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {isGestor && chamado.status === "aberto" && (
                    <Checkbox
                      checked={selectedChamados.has(chamado.id)}
                      onCheckedChange={() => toggleSelect(chamado.id)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-bold">{chamado.codigo}</span>
                      <Badge className={STATUS_COLORS[chamado.status] || ""}>
                        {chamado.status.charAt(0).toUpperCase() + chamado.status.slice(1)}
                      </Badge>
                      <Badge variant={(PRIORIDADE_COLORS[chamado.prioridade] || "secondary") as any}>
                        {chamado.prioridade.charAt(0).toUpperCase() + chamado.prioridade.slice(1)}
                      </Badge>
                      <Badge variant="outline">{TIPO_LABELS[chamado.tipo_demanda] || chamado.tipo_demanda}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{chamado.descricao}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>📍 {chamado.local_servico}</span>
                      {chamado.regionais && <span>{chamado.regionais.sigla}</span>}
                      {chamado.solicitante_profile && <span>Por: {chamado.solicitante_profile.full_name}</span>}
                      <span>{format(new Date(chamado.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {chamado.os_id && <Badge variant="outline" className="text-[10px]">OS vinculada</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewChamado(chamado)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(isGestor || chamado.solicitante_id === user?.id) && chamado.status === "aberto" && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(chamado.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NovoChamadoDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* View dialog */}
      <Dialog open={!!viewChamado} onOpenChange={() => setViewChamado(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chamado {viewChamado?.codigo}</DialogTitle>
            <DialogDescription>Detalhes do chamado</DialogDescription>
          </DialogHeader>
          {viewChamado && (
            <div className="space-y-3 text-sm">
              <div><strong>Tipo:</strong> {TIPO_LABELS[viewChamado.tipo_demanda] || viewChamado.tipo_demanda}</div>
              <div><strong>Local:</strong> {viewChamado.local_servico}</div>
              <div><strong>Prioridade:</strong> {viewChamado.prioridade}</div>
              <div><strong>Descrição:</strong><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{viewChamado.descricao}</p></div>
              {viewChamado.justificativa_urgente && (
                <div><strong>Justificativa de Urgência:</strong><p className="mt-1 text-muted-foreground">{viewChamado.justificativa_urgente}</p></div>
              )}
              {viewChamado.regionais && <div><strong>Regional:</strong> {viewChamado.regionais.sigla} — {viewChamado.regionais.nome}</div>}
              {viewChamado.delegacias && <div><strong>Delegacia:</strong> {viewChamado.delegacias.nome}</div>}
              {viewChamado.uops && <div><strong>UOP:</strong> {viewChamado.uops.nome}</div>}
              {viewChamado.solicitante_profile && <div><strong>Solicitante:</strong> {viewChamado.solicitante_profile.full_name}</div>}
              <div><strong>Data:</strong> {format(new Date(viewChamado.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
              {viewChamado.foto && (
                <div>
                  <strong>Foto:</strong>
                  <img src={viewChamado.foto} alt="Foto do chamado" className="mt-2 rounded-lg max-h-60 object-contain" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
