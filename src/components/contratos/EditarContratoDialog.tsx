import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateContrato, type Contrato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUsersByRole } from "@/hooks/useUsersByRole";

interface Props {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarContratoDialog({ contrato, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const updateContrato = useUpdateContrato();
  const { data: regionais = [] } = useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionais").select("id, nome, sigla").order("sigla");
      if (error) throw error;
      return data;
    },
  });
  const { data: prepostos = [] } = useUsersByRole(["preposto"]);

  const [form, setForm] = useState({
    numero: "",
    empresa: "",
    regional_id: "",
    tipo_servico: "manutencao_predial",
    objeto: "",
    valor_total: "",
    data_inicio: "",
    data_fim: "",
    status: "vigente",
    preposto_user_id: "",
  });

  useEffect(() => {
    if (contrato) {
      setForm({
        numero: contrato.numero,
        empresa: contrato.empresa,
        regional_id: contrato.regional_id ?? "",
        tipo_servico: contrato.tipo_servico,
        objeto: contrato.objeto ?? "",
        valor_total: String(contrato.valor_total),
        data_inicio: contrato.data_inicio,
        data_fim: contrato.data_fim,
        status: contrato.status,
        preposto_user_id: contrato.preposto_user_id ?? "",
      });
    }
  }, [contrato]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const selectedPreposto = prepostos.find((p) => p.user_id === form.preposto_user_id);

  const handleSubmit = async () => {
    if (!contrato) return;
    if (!form.numero || !form.empresa || !form.data_inicio || !form.data_fim) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await updateContrato.mutateAsync({
        id: contrato.id,
        numero: form.numero.trim(),
        empresa: form.empresa.trim(),
        regional_id: form.regional_id || null,
        tipo_servico: form.tipo_servico,
        objeto: form.objeto.trim() || null,
        valor_total: parseFloat(form.valor_total) || 0,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        status: form.status,
        preposto_user_id: form.preposto_user_id && form.preposto_user_id !== "none" ? form.preposto_user_id : null,
        preposto_nome: selectedPreposto?.full_name || null,
        preposto_telefone: selectedPreposto?.phone || null,
      });
      toast({ title: "Contrato atualizado com sucesso" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao atualizar contrato", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Número do Contrato *</Label>
            <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Regional</Label>
            <Select value={form.regional_id} onValueChange={(v) => set("regional_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione a regional" /></SelectTrigger>
              <SelectContent>
                {regionais.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Serviço</Label>
            <Select value={form.tipo_servico} onValueChange={(v) => set("tipo_servico", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manutencao_predial">Manutenção Predial</SelectItem>
                <SelectItem value="manutencao_ar_condicionado">Manutenção de Ar Condicionado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor Global (R$)</Label>
            <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => set("valor_total", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data Início *</Label>
            <Input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data Fim *</Label>
            <Input type="date" value={form.data_fim} onChange={(e) => set("data_fim", e.target.value)} />
          </div>
          <div className="col-span-full space-y-1.5">
            <Label>Objeto</Label>
            <Textarea value={form.objeto} onChange={(e) => set("objeto", e.target.value)} rows={2} />
          </div>
        </div>

        <div className="border-t pt-4 mt-2">
          <h3 className="text-sm font-semibold mb-3">Preposto da Empresa</h3>
          <div className="space-y-1.5">
            <Label>Selecionar Preposto</Label>
            <Select value={form.preposto_user_id} onValueChange={(v) => set("preposto_user_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário com perfil de Preposto..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {prepostos.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}{p.phone ? ` — ${p.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {prepostos.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum usuário com perfil "Preposto" cadastrado.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={updateContrato.isPending}>
            {updateContrato.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
