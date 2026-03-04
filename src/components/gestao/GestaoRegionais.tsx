import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, Plus, Pencil, Trash2 } from "lucide-react";

type Regional = {
  id: string;
  nome: string;
  sigla: string;
  uf: string;
  uasg_codigo: string | null;
  created_at: string;
};

export default function GestaoRegionais() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<Regional | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ nome: "", sigla: "", uf: "", uasg_codigo: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<Regional | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: regionais, isLoading } = useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionais").select("*").order("sigla");
      if (error) throw error;
      return data as Regional[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: { id?: string; nome: string; sigla: string; uf: string; uasg_codigo?: string | null }) => {
      const payload = { nome: values.nome, sigla: values.sigla, uf: values.uf, uasg_codigo: values.uasg_codigo || null } as any;
      if (values.id) {
        const { error } = await supabase.from("regionais").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("regionais").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regionais"] });
      toast.success(isNew ? "Regional criada!" : "Regional atualizada!");
      closeDialog();
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("regionais").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regionais"] });
      toast.success("Excluído com sucesso!");
      setDeleteConfirm(null);
      setBulkDeleteConfirm(false);
      setSelected(new Set());
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const openNew = () => { setIsNew(true); setForm({ nome: "", sigla: "", uf: "", uasg_codigo: "" }); setEditItem({} as Regional); };
  const openEdit = (r: Regional) => { setIsNew(false); setForm({ nome: r.nome, sigla: r.sigla, uf: r.uf, uasg_codigo: r.uasg_codigo || "" }); setEditItem(r); };
  const closeDialog = () => { setEditItem(null); setIsNew(false); };

  const handleSave = () => {
    if (!form.nome || !form.sigla || !form.uf) { toast.error("Preencha todos os campos."); return; }
    upsert.mutate({ id: isNew ? undefined : editItem?.id, nome: form.nome, sigla: form.sigla, uf: form.uf, uasg_codigo: form.uasg_codigo || null });
  };

  const filtered = (regionais || []).filter((r) =>
    r.nome.toLowerCase().includes(search.toLowerCase()) || r.sigla.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar regional..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir {selected.size}
          </Button>
        )}
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Regional
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma regional encontrada.</div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{r.sigla}</p>
                  <p className="text-xs text-muted-foreground">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">UF: {r.uf} · UASG: {r.uasg_codigo || "—"}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => setDeleteConfirm(r)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>UASG</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>UF</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                <TableCell className="font-medium">{r.sigla}</TableCell>
                <TableCell>{r.nome}</TableCell>
                <TableCell>{r.uf}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.uasg_codigo || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nova Regional" : "Editar Regional"}</DialogTitle>
            <DialogDescription>{isNew ? "Preencha os dados da nova regional" : editItem?.sigla}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Sigla</Label><Input value={form.sigla} onChange={(e) => setForm({ ...form, sigla: e.target.value })} placeholder="Ex: SPRF/PE" /></div>
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></div>
            <div><Label>UF</Label><Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} placeholder="Ex: PE" maxLength={2} /></div>
            <div><Label>Código UASG</Label><Input value={form.uasg_codigo} onChange={(e) => setForm({ ...form, uasg_codigo: e.target.value })} placeholder="Ex: 200113" maxLength={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Regional</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir "{deleteConfirm?.sigla}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMut.mutate([deleteConfirm.id])} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {selected.size} regional(is)</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMut.mutate(Array.from(selected))} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
