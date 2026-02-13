import { useState, useEffect } from "react";
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
import { useUpdateOS, type OrdemServico } from "@/hooks/useOrdensServico";
import { useContratos } from "@/hooks/useContratos";
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
  const { data: contratos = [] } = useContratos();

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    tipo: "corretiva",
    prioridade: "media",
    contrato_id: "",
    responsavel_id: "",
  });

  useEffect(() => {
    if (os) {
      setForm({
        titulo: os.titulo,
        descricao: os.descricao ?? "",
        tipo: os.tipo,
        prioridade: os.prioridade,
        contrato_id: os.contrato_id ?? "",
        responsavel_id: os.responsavel_id ?? "",
      });
    }
  }, [os]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!os || !form.titulo.trim()) {
      toast.error("Preencha o título");
      return;
    }
    try {
      await updateOS.mutateAsync({
        id: os.id,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        tipo: form.tipo as any,
        prioridade: form.prioridade as any,
        contrato_id: form.contrato_id || null,
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
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
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
            <Label>Contrato Vinculado</Label>
            <Select value={form.contrato_id || "none"} onValueChange={(v) => set("contrato_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.numero} — {c.empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
