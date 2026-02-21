import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRegionais } from "@/hooks/useHierarchy";
import { toast } from "sonner";
import { Users, Search, Loader2, Shield } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { useUserRole } from "@/hooks/useUserRole";

type UserWithRole = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  regional_id: string | null;
  regional: { id: string; nome: string; sigla: string } | null;
  role: string | null;
  email: string | null;
};

function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles with regional join
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*, regional:regionais(id, nome, sigla)")
        .order("full_name");
      if (pErr) throw pErr;

      // Fetch all roles
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("*");
      if (rErr) throw rErr;

      const roleMap = new Map<string, string>();
      (roles || []).forEach((r) => roleMap.set(r.user_id, r.role));

      return (profiles || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        regional_id: (p as any).regional_id,
        regional: (p as any).regional,
        role: roleMap.get(p.user_id) || "operador",
        email: null as string | null, // email not accessible from profiles
      })) as UserWithRole[];
    },
  });
}

function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Upsert the role
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

function useUpdateUserRegional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, regionalId }: { userId: string; regionalId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ regional_id: regionalId } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

const roleLabels: Record<string, string> = {
  gestor_master: "Gestor Master",
  gestor_nacional: "Gestor Nacional",
  gestor_regional: "Gestor Regional",
  fiscal_contrato: "Fiscal de Contrato",
  operador: "Operador",
};

const roleColors: Record<string, string> = {
  gestor_master: "purple",
  gestor_nacional: "destructive",
  gestor_regional: "default",
  fiscal_contrato: "secondary",
  operador: "secondary",
};

export default function Usuarios() {
  const { data: users, isLoading } = useAdminUsers();
  const regionais = useRegionais();
  const { data: currentRole } = useUserRole();
  const updateRole = useUpdateUserRole();
  const updateRegional = useUpdateUserRegional();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editRegionalId, setEditRegionalId] = useState("");

  const isCurrentUserMaster = currentRole === "gestor_master";
  const canSeeNacional = isCurrentUserMaster || currentRole === "gestor_nacional";

  const filtered = useMemo(() => (users || []).filter((u) => {
    if (!isCurrentUserMaster && u.role === "gestor_master") return false;
    if (!canSeeNacional && u.role === "gestor_nacional") return false;
    return u.full_name.toLowerCase().includes(search.toLowerCase());
  }), [users, search, isCurrentUserMaster, canSeeNacional]);

  const openEdit = (user: UserWithRole) => {
    setEditUser(user);
    setEditRole(user.role || "operador");
    setEditRegionalId(user.regional_id || "none");
  };

  const handleSave = async () => {
    if (!editUser) return;
    try {
      await updateRole.mutateAsync({ userId: editUser.user_id, role: editRole });
      await updateRegional.mutateAsync({
        userId: editUser.user_id,
        regionalId: editRegionalId === "none" ? null : editRegionalId,
      });
      toast.success("Usuário atualizado!");
      setEditUser(null);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie papéis e regionais dos usuários</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
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
                  <TableHead>Regional</TableHead>
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
                      {u.regional ? `${u.regional.sigla} — ${u.regional.nome}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
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
                  {[...Constants.public.Enums.app_role].sort((a, b) => (roleLabels[a] || a).localeCompare(roleLabels[b] || b)).map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regional</Label>
              <Select value={editRegionalId} onValueChange={setEditRegionalId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {(regionais.data || []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateRole.isPending || updateRegional.isPending}>
              {(updateRole.isPending || updateRegional.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
