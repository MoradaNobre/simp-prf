import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search, Pencil, Trash2 } from "lucide-react";
import { generateOSReport } from "@/utils/generateOSReport";
import { toast } from "sonner";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { useUserRole } from "@/hooks/useUserRole";

export function RelatoriosPagamento() {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data: role } = useUserRole();
  const isGestorNacional = role === "gestor_nacional";
  const queryClient = useQueryClient();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editRelatorio, setEditRelatorio] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ titulo_os: "", valor_atestado: "" });
  const [saving, setSaving] = useState(false);

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ["relatorios_os", effectiveRegionalId, search],
    queryFn: async () => {
      let q = supabase
        .from("relatorios_os")
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

  const handleDownload = async (relatorio: any) => {
    setDownloading(relatorio.id);
    try {
      const dados = relatorio.dados_json;
      const { data: os, error } = await supabase
        .from("ordens_servico")
        .select("*, uops(nome, delegacia_id, delegacias(nome, regional_id, regionais(sigla, nome))), regionais(sigla, nome)")
        .eq("id", relatorio.os_id)
        .single();
      if (error) throw error;

      const { data: custos } = await supabase
        .from("os_custos")
        .select("descricao, tipo, valor")
        .eq("os_id", relatorio.os_id);

      generateOSReport({
        os: os as any,
        contrato: dados.contrato || null,
        custos: (custos || []).map((c: any) => ({ descricao: c.descricao, tipo: c.tipo, valor: Number(c.valor) })),
        responsaveis: dados.responsaveis || [],
        valorAtestado: relatorio.valor_atestado,
        geradoPor: dados.gerado_por_nome || "",
        historicoFluxo: dados.historicoFluxo || [],
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("relatorios_os").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Relatório excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["relatorios_os"] });
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openEdit = (r: any) => {
    setEditRelatorio(r);
    setEditForm({ titulo_os: r.titulo_os, valor_atestado: String(r.valor_atestado) });
  };

  const handleSaveEdit = async () => {
    if (!editRelatorio) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("relatorios_os")
        .update({
          titulo_os: editForm.titulo_os,
          valor_atestado: Number(editForm.valor_atestado),
        })
        .eq("id", editRelatorio.id);
      if (error) throw error;
      toast.success("Relatório atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["relatorios_os"] });
      setEditRelatorio(null);
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, título ou empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canFilterRegional && (
          <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !relatorios?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum relatório encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código OS</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Valor Atestado</TableHead>
                  <TableHead>Gerado em</TableHead>
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
                      R$ {Number(r.valor_atestado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.gerado_em).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(r)}
                          disabled={downloading === r.id}
                          title="Baixar PDF"
                        >
                          {downloading === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        {isGestorNacional && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(r.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editRelatorio} onOpenChange={(open) => !open && setEditRelatorio(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Código OS</Label>
              <Input value={editRelatorio?.codigo_os || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Título da OS</Label>
              <Input value={editForm.titulo_os} onChange={(e) => setEditForm((f) => ({ ...f, titulo_os: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Valor Atestado (R$)</Label>
              <Input type="number" step="0.01" min="0" value={editForm.valor_atestado} onChange={(e) => setEditForm((f) => ({ ...f, valor_atestado: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRelatorio(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.titulo_os}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
