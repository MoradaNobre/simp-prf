import { useState, useEffect } from "react";
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
import { useRegionais, useDelegacias, useUops, useEquipamentos } from "@/hooks/useHierarchy";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface Props {
  os: OrdemServico | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarOSDialog({ os, open, onOpenChange }: Props) {
  const updateOS = useUpdateOS();
  const { data: regionais = [] } = useRegionais();

  const [form, setForm] = useState({
    descricao: "",
    tipo: "corretiva",
    prioridade: "media",
  });
  const [selectedRegionalId, setSelectedRegionalId] = useState("");
  const [delegaciaId, setDelegaciaId] = useState("");
  const [uopId, setUopId] = useState("");
  const [equipamentoId, setEquipamentoId] = useState("");

  const delegacias = useDelegacias(selectedRegionalId || undefined);
  const uops = useUops(delegaciaId || undefined);
  const equipamentos = useEquipamentos(uopId || undefined);

  useEffect(() => {
    if (os) {
      setForm({
        descricao: os.descricao ?? "",
        tipo: os.tipo,
        prioridade: os.prioridade,
      });
      setEquipamentoId(os.equipamento_id ?? "");
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
        equipamento_id: equipamentoId || null,
      });
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
              <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.os_prioridade.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Regional</Label>
            <Select value={selectedRegionalId} onValueChange={(v) => { setSelectedRegionalId(v); setDelegaciaId(""); setUopId(""); setEquipamentoId(""); }}>
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
              <Select value={delegaciaId} onValueChange={(v) => { setDelegaciaId(v); setUopId(""); setEquipamentoId(""); }}>
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
              <Select value={uopId} onValueChange={(v) => { setUopId(v); setEquipamentoId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(uops.data || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {uopId && (equipamentos.data || []).length > 0 && (
            <div className="space-y-1.5">
              <Label>Equipamento (opcional)</Label>
              <Select value={equipamentoId} onValueChange={setEquipamentoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(equipamentos.data || []).map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.nome} ({eq.categoria})</SelectItem>
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
