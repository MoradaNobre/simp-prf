import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, PackagePlus, Trash2, Eye, ClipboardCheck, ArrowUpDown, Pencil, Info, Ban } from "lucide-react";
import { NovoChamadoDialog } from "@/components/chamados/NovoChamadoDialog";
import { useChamados, useUpdateChamado, useDeleteChamado, type Chamado } from "@/hooks/useChamados";
import { useCreateOS } from "@/hooks/useOrdensServico";
import { ChamadoStatusTimeline } from "@/components/chamados/ChamadoStatusTimeline";
import { EditarChamadoDialog } from "@/components/chamados/EditarChamadoDialog";
import { GUTMatrixPanel } from "@/components/os/GUTMatrixPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
  analisado: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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
  const isMaster = role === "gestor_master";
  const isGestor = isAdminRole(role) || role === "gestor_regional";
  const isGestorOrFiscal = isGestor || role === "fiscal_contrato";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChamados, setSelectedChamados] = useState<Set<string>>(new Set());
  const [viewChamado, setViewChamado] = useState<Chamado | null>(null);
  const [analyzeChamado, setAnalyzeChamado] = useState<Chamado | null>(null);
  const [gutValues, setGutValues] = useState<{ gut_gravidade: number; gut_urgencia: number; gut_tendencia: number } | null>(null);
  const [creatingOS, setCreatingOS] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortByScore, setSortByScore] = useState(false);
  const [editChamado, setEditChamado] = useState<Chamado | null>(null);
  const [cancelChamado, setCancelChamado] = useState<Chamado | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const { data: chamados = [], isLoading } = useChamados({
    status: statusFilter || undefined,
    regionalId,
    search: search || undefined,
  });

  // Sort by GUT score descending if enabled
  const sortedChamados = sortByScore
    ? [...chamados].sort((a, b) => (b.gut_score ?? 0) - (a.gut_score ?? 0))
    : chamados;

  // Fetch OS data for viewed chamado
  const viewOsId = viewChamado?.os_id;
  const { data: viewOsData } = useQuery({
    queryKey: ["os-for-chamado", viewOsId],
    queryFn: async () => {
      if (!viewOsId) return null;
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("codigo, status, titulo")
        .eq("id", viewOsId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!viewOsId,
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

  const handleAnalyze = async () => {
    if (!analyzeChamado || !gutValues) return;
    try {
      await updateChamado.mutateAsync({
        id: analyzeChamado.id,
        status: "analisado",
        gut_gravidade: gutValues.gut_gravidade,
        gut_urgencia: gutValues.gut_urgencia,
        gut_tendencia: gutValues.gut_tendencia,
      });
      toast.success("Chamado analisado com sucesso!");
      setAnalyzeChamado(null);
      setGutValues(null);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || err));
    }
  };

  const handleCreateOSFromChamados = async () => {
    if (selectedChamados.size === 0 || !user) return;
    setCreatingOS(true);
    try {
      const selected = chamados.filter(c => selectedChamados.has(c.id) && c.status === "analisado");
      if (selected.length === 0) { toast.error("Selecione chamados analisados."); return; }

      // Use first chamado's data as base
      const base = selected[0];
      const tipoLabel = TIPO_LABELS[base.tipo_demanda] || base.tipo_demanda;

      // Build combined description
      const descParts = selected.map((c) => {
        const tipoL = TIPO_LABELS[c.tipo_demanda] || c.tipo_demanda;
        const gutInfo = c.gut_score ? ` [GUT: ${c.gut_score}]` : "";
        return `--- Chamado ${c.codigo} (${tipoL})${gutInfo} ---\nLocal: ${c.local_servico}\n${c.descricao}${c.justificativa_urgente ? `\n[Justificativa urgência]: ${c.justificativa_urgente}` : ""}`;
      });
      const descricaoFinal = descParts.join("\n\n");

      // Use highest GUT score to determine priority
      const maxScore = Math.max(...selected.map(c => c.gut_score ?? 0));
      let maxPrio: string;
      if (maxScore >= 64) maxPrio = "urgente";
      else if (maxScore >= 27) maxPrio = "alta";
      else if (maxScore >= 8) maxPrio = "media";
      else maxPrio = "baixa";

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

  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedChamados.size === 0) return;
    setBulkDeleting(true);
    try {
      for (const id of selectedChamados) {
        await deleteChamado.mutateAsync(id);
      }
      toast.success(`${selectedChamados.size} chamado(s) excluído(s).`);
      setSelectedChamados(new Set());
    } catch (err: any) {
      toast.error("Erro: " + (err.message || err));
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chamados</h1>
          <p className="text-muted-foreground text-sm">
            {role === "operador"
              ? "Registre chamados de manutenção para sua regional. Após análise, eles serão agrupados em Ordens de Serviço."
              : "Abra chamados, analise com a Matriz GUT e agrupe-os em Ordens de Serviço."}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Chamado
        </Button>
      </div>

      {/* Role-based workflow guide */}
      {role === "operador" && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 text-sm">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Como funciona o fluxo de chamados?</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700 dark:text-blue-400">
              <li>Você abre um chamado descrevendo o problema.</li>
              <li>Um <strong>Gestor</strong> ou <strong>Fiscal</strong> analisa o chamado com a Matriz GUT (priorização técnica).</li>
              <li>Após análise, o chamado é agrupado em uma <strong>Ordem de Serviço</strong> para execução.</li>
            </ol>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-500">Você pode editar seus chamados enquanto estiverem com status <strong>Aberto</strong>.</p>
          </div>
        </div>
      )}

      {isGestorOrFiscal && !isMaster && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 text-sm">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">Ações disponíveis:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
              <li><strong className="text-destructive">📋 Analisar</strong> — Clique no ícone vermelho para avaliar chamados <strong>Abertos</strong> com a Matriz GUT.</li>
              <li><strong>☑️ Selecionar + Gerar OS</strong> — Marque chamados <strong>Analisados</strong> (checkbox) e clique em <strong>Gerar OS</strong> para agrupá-los em uma Ordem de Serviço.</li>
              <li>Você pode selecionar vários chamados analisados para criar uma OS consolidada.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar chamados..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="analisado">Analisados</SelectItem>
            <SelectItem value="vinculado">Vinculados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <RegionalFilterSelect value={regionalId} onChange={setRegionalId} />
        <Button
          variant={sortByScore ? "default" : "outline"}
          size="icon"
          onClick={() => setSortByScore(v => !v)}
          title="Ordenar por Score GUT"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Gestor action bar */}
      {(isGestorOrFiscal || isMaster) && selectedChamados.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">{selectedChamados.size} chamado(s) selecionado(s)</span>
          {/* Only show Gerar OS if there are analisado chamados selected */}
          {[...selectedChamados].some(id => chamados.find(c => c.id === id)?.status === "analisado") && (
            <Button size="sm" onClick={handleCreateOSFromChamados} disabled={creatingOS}>
              {creatingOS ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-2" />}
              Gerar OS
            </Button>
          )}
          {isMaster && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir Selecionados
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedChamados(new Set())}>Limpar</Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : sortedChamados.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground space-y-2">
          <p>Nenhum chamado encontrado.</p>
          {statusFilter === "aberto" && isGestorOrFiscal && (
            <p className="text-xs">Não há chamados aguardando análise no momento.</p>
          )}
          {statusFilter === "analisado" && isGestorOrFiscal && (
            <p className="text-xs">Não há chamados analisados aguardando vinculação a uma OS.</p>
          )}
          {role === "operador" && (
            <p className="text-xs">Clique em <strong>+ Novo Chamado</strong> para registrar uma demanda de manutenção.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedChamados.map((chamado) => (
            <Card key={chamado.id} className={`${selectedChamados.has(chamado.id) ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox: master can select any, gestors/fiscais only analisado */}
                  {(isMaster || (isGestorOrFiscal && chamado.status === "analisado")) && (
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
                        {chamado.status === "analisado" ? "Analisado" : chamado.status.charAt(0).toUpperCase() + chamado.status.slice(1)}
                      </Badge>
                      <Badge variant={(PRIORIDADE_COLORS[chamado.prioridade] || "secondary") as any}>
                        {chamado.prioridade.charAt(0).toUpperCase() + chamado.prioridade.slice(1)}
                      </Badge>
                      <Badge variant="outline">{TIPO_LABELS[chamado.tipo_demanda] || chamado.tipo_demanda}</Badge>
                      {chamado.gut_score != null && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          GUT: {chamado.gut_score}
                        </Badge>
                      )}
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
                    {/* Analyze button: gestors/fiscais can analyze "aberto" chamados */}
                    {isGestorOrFiscal && chamado.status === "aberto" && (
                      <Button size="icon" variant="ghost" title="Analisar (Matriz GUT)" className="text-destructive hover:text-destructive" onClick={() => { setAnalyzeChamado(chamado); setGutValues(null); }}>
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Edit button: operador can edit own aberto chamados, gestors can edit aberto chamados */}
                    {chamado.status === "aberto" && (chamado.solicitante_id === user?.id || isGestor || isMaster) && (
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditChamado(chamado)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setViewChamado(chamado)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Cancel button: gestors/fiscais can cancel any "aberto", operador can cancel own "aberto" */}
                    {chamado.status === "aberto" && (isGestorOrFiscal || (role === "operador" && chamado.solicitante_id === user?.id)) && (
                      <Button size="icon" variant="ghost" title="Cancelar chamado" className="text-amber-600 hover:text-amber-600" onClick={() => { setCancelChamado(chamado); setMotivoCancelamento(""); }}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    {isMaster && (
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
      <EditarChamadoDialog chamado={editChamado} open={!!editChamado} onOpenChange={(v) => !v && setEditChamado(null)} />

      {/* Analyze GUT dialog */}
      <Dialog open={!!analyzeChamado} onOpenChange={() => setAnalyzeChamado(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Analisar Chamado {analyzeChamado?.codigo}</DialogTitle>
            <DialogDescription>Preencha a Matriz GUT para definir a prioridade técnica deste chamado.</DialogDescription>
          </DialogHeader>
          {analyzeChamado && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><strong>Tipo:</strong> {TIPO_LABELS[analyzeChamado.tipo_demanda] || analyzeChamado.tipo_demanda}</p>
                <p><strong>Local:</strong> {analyzeChamado.local_servico}</p>
                <p className="text-muted-foreground">{analyzeChamado.descricao}</p>
              </div>

              <GUTMatrixPanel editable onChange={setGutValues} />

              <DialogFooter>
                <Button variant="outline" onClick={() => setAnalyzeChamado(null)}>Cancelar</Button>
                <Button onClick={handleAnalyze} disabled={!gutValues}>
                  <ClipboardCheck className="h-4 w-4 mr-2" /> Confirmar Análise
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewChamado} onOpenChange={() => setViewChamado(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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

              {/* GUT read-only display */}
              {viewChamado.gut_score != null && (
                <GUTMatrixPanel
                  gravidade={viewChamado.gut_gravidade}
                  urgencia={viewChamado.gut_urgencia}
                  tendencia={viewChamado.gut_tendencia}
                  score={viewChamado.gut_score}
                />
              )}

              {viewChamado.foto && (
                <div>
                  <strong>Foto:</strong>
                  <img src={viewChamado.foto} alt="Foto do chamado" className="mt-2 rounded-lg max-h-60 object-contain" />
                </div>
              )}

              {/* Painel de acompanhamento */}
              <div className="border-t pt-4 mt-4">
                <ChamadoStatusTimeline chamado={viewChamado} osData={viewOsData} />
              </div>
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

      {/* Bulk delete confirm */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedChamados.size} chamado(s)?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os chamados selecionados serão permanentemente excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir Todos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel chamado dialog */}
      <Dialog open={!!cancelChamado} onOpenChange={() => setCancelChamado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Chamado {cancelChamado?.codigo}</DialogTitle>
            <DialogDescription>Informe o motivo do cancelamento. Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Motivo do cancelamento *</Label>
              <Textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                rows={3}
              />
              {motivoCancelamento.length === 0 && (
                <p className="text-xs text-destructive mt-1">O motivo é obrigatório.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelChamado(null)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={!motivoCancelamento.trim()}
              onClick={async () => {
                if (!cancelChamado || !motivoCancelamento.trim()) return;
                try {
                  await updateChamado.mutateAsync({
                    id: cancelChamado.id,
                    status: "cancelado",
                    motivo_cancelamento: motivoCancelamento.trim(),
                  });
                  toast.success("Chamado cancelado.");
                  setCancelChamado(null);
                  setMotivoCancelamento("");
                } catch (err: any) {
                  toast.error("Erro: " + (err.message || err));
                }
              }}
            >
              <Ban className="h-4 w-4 mr-2" />
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
