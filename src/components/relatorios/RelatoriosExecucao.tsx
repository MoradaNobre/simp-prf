import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search, Mail, MailX, Pencil, Trash2 } from "lucide-react";
import { downloadOSExecucaoReport } from "@/utils/generateOSExecucaoReport";
import { toast } from "sonner";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";

export function RelatoriosExecucao() {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [editValor, setEditValor] = useState("");
  const [editTitulo, setEditTitulo] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const isMobile = useIsMobile();
  const { data: role } = useUserRole();
  const isGestorNacional = role === "gestor_nacional";
  const queryClient = useQueryClient();

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ["relatorios_execucao", effectiveRegionalId, search],
    queryFn: async () => {
      let q = supabase
        .from("relatorios_execucao")
        .select("*")
        .order("gerado_em", { ascending: false });

      if (effectiveRegionalId) {
        q = q.eq("regional_id", effectiveRegionalId);
      }

      if (search) {
        q = q.or(`codigo_os.ilike.%${search}%,titulo_os.ilike.%${search}%,contrato_empresa.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("relatorios_execucao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relatorios_execucao"] });
      toast.success("Relatório excluído com sucesso.");
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, titulo_os, codigo_os, valor_orcamento }: { id: string; titulo_os: string; codigo_os: string; valor_orcamento: number }) => {
      const { error } = await supabase
        .from("relatorios_execucao")
        .update({ titulo_os, codigo_os, valor_orcamento })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relatorios_execucao"] });
      toast.success("Relatório atualizado com sucesso.");
      setEditingReport(null);
    },
    onError: (err: any) => toast.error("Erro ao atualizar: " + err.message),
  });

  const openEdit = (r: any) => {
    setEditingReport(r);
    setEditTitulo(r.titulo_os);
    setEditCodigo(r.codigo_os);
    setEditValor(String(r.valor_orcamento));
  };

  const handleSaveEdit = () => {
    if (!editingReport) return;
    const valor = parseFloat(editValor.replace(",", "."));
    if (isNaN(valor)) {
      toast.error("Valor de orçamento inválido.");
      return;
    }
    updateMutation.mutate({
      id: editingReport.id,
      titulo_os: editTitulo,
      codigo_os: editCodigo,
      valor_orcamento: valor,
    });
  };

  const handleDownload = async (relatorio: any) => {
    setDownloading(relatorio.id);
    try {
      const dados = relatorio.dados_json;
      downloadOSExecucaoReport({
        codigo: relatorio.codigo_os,
        titulo: relatorio.titulo_os,
        tipo: dados.tipo || "corretiva",
        descricao: dados.descricao || "",
        localNome: dados.localNome || "—",
        regionalNome: dados.regionalNome || "",
        regionalSigla: dados.regionalSigla || "",
        solicitanteNome: dados.solicitanteNome || "",
        valorOrcamento: relatorio.valor_orcamento,
        contratoNumero: relatorio.contrato_numero || undefined,
        contratoEmpresa: relatorio.contrato_empresa || undefined,
        responsavelExecucaoNome: dados.responsavelExecucaoNome || undefined,
        dataAbertura: dados.dataAbertura || "",
        dataAutorizacao: dados.dataAutorizacao || undefined,
        fiscalNome: dados.fiscalNome || undefined,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  const ActionButtons = ({ r }: { r: any }) => (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleDownload(r)}
        disabled={downloading === r.id}
        title="Baixar PDF"
      >
        {downloading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </Button>
      {isGestorNacional && (
        <>
          <Button size="sm" variant="outline" onClick={() => openEdit(r)} title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O relatório de execução da OS <strong>{r.codigo_os}</strong> será permanentemente removido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(r.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, título ou empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canFilterRegional && (
          <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !relatorios?.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum relatório de execução encontrado.
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {relatorios.map((r: any) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{r.codigo_os}</p>
                  <p className="text-sm truncate">{r.titulo_os}</p>
                </div>
                <ActionButtons r={r} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>R$ {Number(r.valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span>·</span>
                <span>{new Date(r.gerado_em).toLocaleDateString("pt-BR")}</span>
              </div>
              {r.contrato_numero && (
                <p className="text-xs text-muted-foreground truncate">{r.contrato_numero} — {r.contrato_empresa}</p>
              )}
              {r.email_enviado ? (
                <Badge variant="outline" className="text-xs gap-1"><Mail className="h-3 w-3" /> Enviado</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1"><MailX className="h-3 w-3" /> Não enviado</Badge>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código OS</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.codigo_os}</TableCell>
                    <TableCell>{r.titulo_os}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.contrato_numero ? `${r.contrato_numero} — ${r.contrato_empresa}` : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(r.valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.gerado_em).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {r.email_enviado ? (
                        <Badge variant="outline" className="text-xs gap-1"><Mail className="h-3 w-3" /> Enviado</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1"><MailX className="h-3 w-3" /> Não enviado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionButtons r={r} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Relatório de Execução</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Código OS</Label>
              <Input value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor Orçamento (R$)</Label>
              <Input value={editValor} onChange={(e) => setEditValor(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReport(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
