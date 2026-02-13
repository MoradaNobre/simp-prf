import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRegionais } from "@/hooks/useHierarchy";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

type UserRegional = { id: string; nome: string; sigla: string };

type UserWithRole = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  regional_id: string | null;
  regional: UserRegional | null;
  regionais: UserRegional[];
  role: string | null;
};

function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*, regional:regionais(id, nome, sigla)")
        .order("full_name");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("*");
      if (rErr) throw rErr;

      // Fetch user_regionais for all users
      const { data: userRegionais, error: urErr } = await supabase
        .from("user_regionais" as any)
        .select("user_id, regional_id, regionais:regional_id(id, nome, sigla)");
      if (urErr) throw urErr;

      const roleMap = new Map<string, string>();
      (roles || []).forEach((r) => roleMap.set(r.user_id, r.role));

      // Group regionais by user_id
      const regionaisMap = new Map<string, UserRegional[]>();
      (userRegionais || []).forEach((ur: any) => {
        const list = regionaisMap.get(ur.user_id) || [];
        if (ur.regionais) list.push(ur.regionais);
        regionaisMap.set(ur.user_id, list);
      });

      return (profiles || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        regional_id: (p as any).regional_id,
        regional: (p as any).regional,
        regionais: regionaisMap.get(p.user_id) || [],
        role: roleMap.get(p.user_id) || "operador",
      })) as UserWithRole[];
    },
  });
}

function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: role as any })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

function useUpdateUserRegionais() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, regionalIds }: { userId: string; regionalIds: string[] }) => {
      // Delete existing
      const { error: delErr } = await supabase
        .from("user_regionais" as any)
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;

      // Insert new
      if (regionalIds.length > 0) {
        const rows = regionalIds.map((rid) => ({ user_id: userId, regional_id: rid }));
        const { error: insErr } = await supabase
          .from("user_regionais" as any)
          .insert(rows);
        if (insErr) throw insErr;
      }

      // Also update profiles.regional_id for backwards compat (first regional or null)
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ regional_id: regionalIds[0] || null } as any)
        .eq("user_id", userId);
      if (profErr) throw profErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

const roleLabels: Record<string, string> = {
  gestor_nacional: "Gestor Nacional",
  gestor_regional: "Gestor Regional",
  fiscal_contrato: "Fiscal de Contrato",
  operador: "Operador",
  preposto: "Preposto",
  terceirizado: "Terceirizado",
};

const roleColors: Record<string, string> = {
  gestor_nacional: "destructive",
  gestor_regional: "default",
  fiscal_contrato: "secondary",
  operador: "outline",
  preposto: "default",
  terceirizado: "outline",
};

export default function GestaoUsuarios() {
  const { data: users, isLoading } = useAdminUsers();
  const regionais = useRegionais();
  const updateRole = useUpdateUserRole();
  const updateRegionais = useUpdateUserRegionais();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editRegionalIds, setEditRegionalIds] = useState<string[]>([]);

  const filtered = (users || []).filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (user: UserWithRole) => {
    setEditUser(user);
    setEditRole(user.role || "operador");
    setEditRegionalIds(user.regionais.map((r) => r.id));
  };

  const toggleRegional = (regionalId: string) => {
    setEditRegionalIds((prev) =>
      prev.includes(regionalId)
        ? prev.filter((id) => id !== regionalId)
        : [...prev, regionalId]
    );
  };

  const handleSave = async () => {
    if (!editUser) return;
    try {
      await updateRole.mutateAsync({ userId: editUser.user_id, role: editRole });
      await updateRegionais.mutateAsync({
        userId: editUser.user_id,
        regionalIds: editRegionalIds,
      });
      toast.success("Usuário atualizado!");
      setEditUser(null);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Regionais</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "Sem nome"}</TableCell>
                <TableCell>
                  <Badge variant={roleColors[u.role || "operador"] as any}>
                    {roleLabels[u.role || "operador"]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.regionais.length > 0
                    ? u.regionais.map((r) => r.sigla).join(", ")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>{editUser?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Papel</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.app_role.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regionais</Label>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                {(regionais.data || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`regional-${r.id}`}
                      checked={editRegionalIds.includes(r.id)}
                      onCheckedChange={() => toggleRegional(r.id)}
                    />
                    <label
                      htmlFor={`regional-${r.id}`}
                      className="text-sm cursor-pointer leading-none"
                    >
                      {r.sigla} — {r.nome}
                    </label>
                  </div>
                ))}
                {!(regionais.data || []).length && (
                  <p className="text-sm text-muted-foreground">Nenhuma regional cadastrada.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateRole.isPending || updateRegionais.isPending}>
              {(updateRole.isPending || updateRegionais.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
