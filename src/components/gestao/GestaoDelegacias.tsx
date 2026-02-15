import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRegionais } from "@/hooks/useHierarchy";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { Search, Loader2, Plus, Pencil, Trash2 } from "lucide-react";

type Delegacia = {
  id: string;
  nome: string;
  municipio: string | null;
  regional_id: string;
  created_at: string;
  regional?: { sigla: string } | null;
};

export default function GestaoDelegacias() {
  const qc = useQueryClient();
  const regionais = useRegionais();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const userRegionalIds: string[] = (profile as any)?.regionais?.map((r: any) => r.id) ?? [];
  const isRegional = role === "gestor_regional";
  const [search, setSearch] = useState("");
  const [filterRegional, setFilterRegional] = useState("all");
  const [editItem, setEditItem] = useState<Delegacia | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ nome: "", municipio: "", regional_id: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<Delegacia | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: delegacias, isLoading } = useQuery({
    queryKey: ["admin-delegacias", userRegionalIds],
    queryFn: async () => {
      let q = supabase.from("delegacias").select("*, regional:regionais(sigla)").order("nome");
      if (isRegional && userRegionalIds.length > 0) {
        q = q.in("regional_id", userRegionalIds);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Delegacia[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: { id?: string; nome: string; municipio: string | null; regional_id: string }) => {
      if (values.id) {
        const { error } = await supabase.from("delegacias").update({ nome: values.nome, municipio: values.municipio, regional_id: values.regional_id }).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delegacias").insert({ nome: values.nome, municipio: values.municipio, regional_id: values.regional_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delegacias"] });
      qc.invalidateQueries({ queryKey: ["delegacias"] });
      toast.success(isNew ? "Delegacia criada!" : "Delegacia atualizada!");
      closeDialog();
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("delegacias").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-delegacias"] });
      qc.invalidateQueries({ queryKey: ["delegacias"] });
      toast.success("Excluído com sucesso!");
      setDeleteConfirm(null);
      setBulkDeleteConfirm(false);
      setSelected(new Set());
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const openNew = () => { setIsNew(true); setForm({ nome: "", municipio: "", regional_id: "" }); setEditItem({} as Delegacia); };
  const openEdit = (d: Delegacia) => { setIsNew(false); setForm({ nome: d.nome, municipio: d.municipio || "", regional_id: d.regional_id }); setEditItem(d); };
  const closeDialog = () => { setEditItem(null); setIsNew(false); };

  const handleSave = () => {
    if (!form.nome || !form.regional_id) { toast.error("Preencha nome e regional."); return; }
    upsert.mutate({ id: isNew ? undefined : editItem?.id, nome: form.nome, municipio: form.municipio || null, regional_id: form.regional_id });
  };

  const filtered = (delegacias || []).filter((d) => {
    const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase());
    const matchRegional = filterRegional === "all" || d.regional_id === filterRegional;
    return matchSearch && matchRegional;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar delegacia..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRegional} onValueChange={setFilterRegional}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar regional" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regionais</SelectItem>
            {(isRegional ? (profile as any)?.regionais || [] : regionais.data || []).map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.sigla}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir {selected.size}
          </Button>
        )}
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Delegacia
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma delegacia encontrada.</div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Regional</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell><Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} /></TableCell>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell className="text-muted-foreground">{d.municipio || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{d.regional?.sigla || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{isNew ? "Nova Delegacia" : "Editar Delegacia"}</DialogTitle>
            <DialogDescription>{isNew ? "Preencha os dados" : editItem?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da delegacia" /></div>
            <div><Label>Município</Label><Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} placeholder="Município" /></div>
            <div>
              <Label>Regional</Label>
              <Select value={form.regional_id} onValueChange={(v) => setForm({ ...form, regional_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(isRegional ? (profile as any)?.regionais || [] : regionais.data || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <DialogTitle>Excluir Delegacia</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir "{deleteConfirm?.nome}"?</DialogDescription>
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
            <DialogTitle>Excluir {selected.size} delegacia(s)</DialogTitle>
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
