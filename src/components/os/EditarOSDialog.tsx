import { useState, useEffect } from "react";
import { isGlobalRole } from "@/utils/roles";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateOS, type OrdemServico } from "@/hooks/useOrdensServico";
import { useRegionais, useDelegacias, useUops } from "@/hooks/useHierarchy";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  os: OrdemServico | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarOSDialog({ os, open, onOpenChange }: Props) {
  const updateOS = useUpdateOS();
  const { data: allRegionais = [] } = useRegionais();
  const { data: role } = useUserRole();
  const { user } = useAuth();

  // Fetch user's linked regionais directly for reliability
  const { data: userRegionaisData = [] } = useQuery({
    queryKey: ["user-regionais-edit", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_regionais")
        .select("regional_id, regionais:regional_id(id, nome, sigla)")
        .eq("user_id", user.id);
      return (data || []).map((ur: any) => ur.regionais).filter(Boolean);
    },
    enabled: !!user,
  });

  // Check if this OS was created from chamados (has linked chamados)
  const { data: linkedChamados = [] } = useQuery({
    queryKey: ["os-linked-chamados", os?.id],
    queryFn: async () => {
      if (!os) return [];
      const { data } = await supabase
        .from("chamados")
        .select("id, gut_score")
        .eq("os_id", os.id);
      return data || [];
    },
    enabled: !!os?.id,
  });

  const hasLinkedChamados = linkedChamados.length > 0;

  const isNacional = isGlobalRole(role);
  const regionais = isNacional ? allRegionais : userRegionaisData;

  const [form, setForm] = useState({
    descricao: "",
    tipo: "corretiva",
    prioridade: "media",
  });
  const [selectedRegionalId, setSelectedRegionalId] = useState("");
  const [delegaciaId, setDelegaciaId] = useState("");
  const [uopId, setUopId] = useState("");

  const delegacias = useDelegacias(selectedRegionalId || undefined);
  const uops = useUops(delegaciaId || undefined);

  useEffect(() => {
    if (os) {
      setForm({
        descricao: os.descricao ?? "",
        tipo: os.tipo,
        prioridade: os.prioridade,
      });
      setUopId(os.uop_id ?? "");

      // Derive regional and delegacia from nested uops data
      const uop = os.uops as any;
      const delId = uop?.delegacia_id ?? "";
      const regId = uop?.delegacias?.regional_id ?? "";
      setSelectedRegionalId(regId);
      setDelegaciaId(delId);
    }
  }, [os]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!os) return;
    try {
      await updateOS.mutateAsync({
        id: os.id,
        descricao: form.descricao.trim() || null,
        tipo: form.tipo as any,
        prioridade: form.prioridade as any,
        uop_id: uopId || null,
        regional_id: selectedRegionalId || null,
      } as any);
      toast.success("OS atualizada com sucesso");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar OS: " + err.message);
    }
  };

  if (!os) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OS — {os.codigo}</DialogTitle>
          <DialogDescription>Altere os dados da Ordem de Serviço</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">{os.titulo}</div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.os_tipo.map((t) => (
                    <SelectItem key={t} value={t}>{t === "corretiva" ? "Corretiva" : "Preventiva"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              {hasLinkedChamados ? (
                <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
                  {form.prioridade.charAt(0).toUpperCase() + form.prioridade.slice(1)}
                  <p className="text-xs text-muted-foreground mt-1">Definida automaticamente pela Matriz GUT do chamado vinculado.</p>
                </div>
              ) : (
                <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.os_prioridade.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Regional</Label>
            <Select value={selectedRegionalId} onValueChange={(v) => { setSelectedRegionalId(v); setDelegaciaId(""); setUopId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a regional..." /></SelectTrigger>
              <SelectContent>
                {regionais.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRegionalId && (
            <div className="space-y-1.5">
              <Label>Delegacia</Label>
              <Select value={delegaciaId} onValueChange={(v) => { setDelegaciaId(v); setUopId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(delegacias.data || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {delegaciaId && (
            <div className="space-y-1.5">
              <Label>UOP</Label>
              <Select value={uopId} onValueChange={setUopId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(uops.data || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={updateOS.isPending}>
            {updateOS.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
