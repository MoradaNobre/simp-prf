import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  gestor_master: "Gestor Master",
  gestor_nacional: "Gestor Nacional",
  gestor_regional: "Gestor Regional",
  fiscal_contrato: "Fiscal de Contrato",
  operador: "Operador",
  preposto: "Preposto",
  terceirizado: "Terceirizado",
};

const roleColors: Record<string, string> = {
  gestor_master: "purple",
  gestor_nacional: "destructive",
  gestor_regional: "default",
  fiscal_contrato: "warning",
  operador: "secondary",
  preposto: "success",
  terceirizado: "secondary",
};

interface EditarPerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarPerfilDialog({ open, onOpenChange }: EditarPerfilDialogProps) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: role } = useUserRole();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("user_id", user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
      toast.success("Perfil atualizado com sucesso");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar perfil: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>Cargo</Label>
            <div>
              {role ? (
                <Badge variant={(roleColors[role] || "secondary") as any}>
                  {roleLabels[role] || role}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Não atribuído</span>
              )}
              {profile?.is_suprido && (
                <Badge variant="outline" className="ml-1 border-amber-500 text-amber-600 dark:text-amber-400">
                  Suprido
                </Badge>
              )}
            </div>
          </div>

          {profile?.regionais && profile.regionais.length > 0 && (
            <div className="space-y-2">
              <Label>Regionais vinculadas</Label>
              <div className="flex flex-wrap gap-1">
                {profile.regionais.map((r: any) => (
                  <Badge key={r.id} variant="outline" className="text-xs">
                    {r.sigla} – {r.nome}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
