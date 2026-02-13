import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOS } from "@/hooks/useOrdensServico";
import { useRegionais, useDelegacias, useUops, useEquipamentos } from "@/hooks/useHierarchy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaOSDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const createOS = useCreateOS();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<string>("corretiva");
  const [prioridade, setPrioridade] = useState<string>("media");
  const [regionalId, setRegionalId] = useState("");
  const [delegaciaId, setDelegaciaId] = useState("");
  const [uopId, setUopId] = useState("");
  const [equipamentoId, setEquipamentoId] = useState("");
  const [fotoAntes, setFotoAntes] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const regionais = useRegionais();
  const delegacias = useDelegacias(regionalId || undefined);
  const uops = useUops(delegaciaId || undefined);
  const equipamentos = useEquipamentos(uopId || undefined);

  const reset = () => {
    setTitulo(""); setDescricao(""); setTipo("corretiva"); setPrioridade("media");
    setRegionalId(""); setDelegaciaId(""); setUopId(""); setEquipamentoId("");
    setFotoAntes(null);
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !user) return;
    setSubmitting(true);
    try {
      let fotoUrl: string | null = null;
      if (fotoAntes) {
        const ext = fotoAntes.name.split(".").pop();
        const path = `antes/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("os-fotos").upload(path, fotoAntes);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("os-fotos").getPublicUrl(path);
        fotoUrl = urlData.publicUrl;
      }

      await createOS.mutateAsync({
        titulo,
        descricao: descricao || null,
        tipo: tipo as any,
        prioridade: prioridade as any,
        uop_id: uopId || null,
        equipamento_id: equipamentoId || null,
        solicitante_id: user.id,
        foto_antes: fotoUrl,
        codigo: "", // trigger will generate
      });

      toast.success("OS criada com sucesso!");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao criar OS: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          <DialogDescription>Preencha os dados para abrir uma nova OS</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Ar-condicionado com defeito" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes do problema..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.os_tipo.map((t) => (
                    <SelectItem key={t} value={t}>{t === "corretiva" ? "Corretiva" : "Preventiva"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.os_prioridade.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Regional</Label>
            <Select value={regionalId} onValueChange={(v) => { setRegionalId(v); setDelegaciaId(""); setUopId(""); setEquipamentoId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(regionais.data || []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {regionalId && (
            <div>
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
            <div>
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
            <div>
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

          <div>
            <Label>Foto (antes)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFotoAntes(e.target.files?.[0] || null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !titulo.trim()}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
