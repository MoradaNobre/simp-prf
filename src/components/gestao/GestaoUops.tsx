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
import { useRegionais, useDelegacias } from "@/hooks/useHierarchy";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import { Search, Loader2, Plus, Pencil, Trash2 } from "lucide-react";

type Uop = {
  id: string;
  nome: string;
  endereco: string | null;
  delegacia_id: string;
  latitude: number | null;
  longitude: number | null;
  area_m2: number | null;
  created_at: string;
  delegacia?: { nome: string; regional?: { sigla: string } | null } | null;
};

export default function GestaoUops() {
  const qc = useQueryClient();
  const regionais = useRegionais();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const userRegionalIds: string[] = (profile as any)?.regionais?.map((r: any) => r.id) ?? [];
  const isRegional = role === "gestor_regional";
  const [search, setSearch] = useState("");
  const [filterRegional, setFilterRegional] = useState("all");
  const [filterDelegacia, setFilterDelegacia] = useState("all");
  const delegacias = useDelegacias(filterRegional === "all" ? undefined : filterRegional);
  const [editItem, setEditItem] = useState<Uop | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formRegional, setFormRegional] = useState("");
  const formDelegacias = useDelegacias(formRegional || undefined);
  const [form, setForm] = useState({ nome: "", endereco: "", delegacia_id: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<Uop | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: uops, isLoading } = useQuery({
    queryKey: ["admin-uops", userRegionalIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("uops").select("*, delegacia:delegacias(nome, regional_id, regional:regionais(sigla))").order("nome");
      if (error) throw error;
      let result = data as (Uop & { delegacia: { regional_id?: string } })[];
      if (isRegional && userRegionalIds.length > 0) {
        result = result.filter(u => u.delegacia?.regional_id && userRegionalIds.includes(u.delegacia.regional_id));
      }
      return result as Uop[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: { id?: string; nome: string; endereco: string | null; delegacia_id: string }) => {
      if (values.id) {
        const { error } = await supabase.from("uops").update({ nome: values.nome, endereco: values.endereco, delegacia_id: values.delegacia_id }).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("uops").insert({ nome: values.nome, endereco: values.endereco, delegacia_id: values.delegacia_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-uops"] });
      qc.invalidateQueries({ queryKey: ["uops"] });
      toast.success(isNew ? "UOP criada!" : "UOP atualizada!");
      closeDialog();
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("uops").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-uops"] });
      qc.invalidateQueries({ queryKey: ["uops"] });
      toast.success("Excluído com sucesso!");
      setDeleteConfirm(null);
      setBulkDeleteConfirm(false);
      setSelected(new Set());
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const openNew = () => { setIsNew(true); setForm({ nome: "", endereco: "", delegacia_id: "" }); setFormRegional(""); setEditItem({} as Uop); };
  const openEdit = (u: Uop) => { setIsNew(false); setForm({ nome: u.nome, endereco: u.endereco || "", delegacia_id: u.delegacia_id }); setFormRegional(""); setEditItem(u); };
  const closeDialog = () => { setEditItem(null); setIsNew(false); };

  const handleSave = () => {
    if (!form.nome || !form.delegacia_id) { toast.error("Preencha nome e delegacia."); return; }
    upsert.mutate({ id: isNew ? undefined : editItem?.id, nome: form.nome, endereco: form.endereco || null, delegacia_id: form.delegacia_id });
  };

  const filtered = (uops || []).filter((u) => {
    const matchSearch = u.nome.toLowerCase().includes(search.toLowerCase());
    const matchDel = filterDelegacia === "all" || u.delegacia_id === filterDelegacia;
    return matchSearch && matchDel;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((u) => u.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar UOP..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRegional} onValueChange={(v) => { setFilterRegional(v); setFilterDelegacia("all"); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar regional" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regionais</SelectItem>
            {(isRegional ? (profile as any)?.regionais || [] : regionais.data || []).map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.sigla}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDelegacia} onValueChange={setFilterDelegacia}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar delegacia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as delegacias</SelectItem>
            {(delegacias.data || []).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir {selected.size}
          </Button>
        )}
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova UOP
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !filtered.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma UOP encontrada.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Delegacia</TableHead>
              <TableHead>Regional</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} /></TableCell>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell className="text-muted-foreground max-w-48 truncate">{u.endereco || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.delegacia?.nome || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.delegacia?.regional?.sigla || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nova UOP" : "Editar UOP"}</DialogTitle>
            <DialogDescription>{isNew ? "Preencha os dados" : editItem?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da UOP" /></div>
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Endereço" /></div>
            <div>
              <Label>Regional (filtro)</Label>
              <Select value={formRegional} onValueChange={(v) => { setFormRegional(v); setForm({ ...form, delegacia_id: "" }); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a regional..." /></SelectTrigger>
                <SelectContent>
                  {(isRegional ? (profile as any)?.regionais || [] : regionais.data || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delegacia</Label>
              <Select value={form.delegacia_id} onValueChange={(v) => setForm({ ...form, delegacia_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(formDelegacias.data || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
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
            <DialogTitle>Excluir UOP</DialogTitle>
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
            <DialogTitle>Excluir {selected.size} UOP(s)</DialogTitle>
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
