import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContrato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoContratoDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const createContrato = useCreateContrato();

  const [form, setForm] = useState({
    numero: "",
    empresa: "",
    tipo_servico: "manutencao_predial",
    objeto: "",
    valor_total: "",
    data_inicio: "",
    data_fim: "",
    preposto_nome: "",
    preposto_email: "",
    preposto_telefone: "",
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.numero || !form.empresa || !form.data_inicio || !form.data_fim) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await createContrato.mutateAsync({
        numero: form.numero.trim(),
        empresa: form.empresa.trim(),
        tipo_servico: form.tipo_servico,
        objeto: form.objeto.trim() || null,
        valor_total: parseFloat(form.valor_total) || 0,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        preposto_nome: form.preposto_nome.trim() || null,
        preposto_email: form.preposto_email.trim() || null,
        preposto_telefone: form.preposto_telefone.trim() || null,
      });
      toast({ title: "Contrato cadastrado com sucesso" });
      onOpenChange(false);
      setForm({
        numero: "", empresa: "", tipo_servico: "manutencao_predial", objeto: "",
        valor_total: "", data_inicio: "", data_fim: "",
        preposto_nome: "", preposto_email: "", preposto_telefone: "",
      });
    } catch {
      toast({ title: "Erro ao cadastrar contrato", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Número do Contrato *</Label>
            <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="Ex: CT-2026/001" />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} placeholder="Razão social" />
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
            <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => set("valor_total", e.target.value)} placeholder="0,00" />
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
            <Textarea value={form.objeto} onChange={(e) => set("objeto", e.target.value)} placeholder="Descrição do objeto contratado" rows={2} />
          </div>
        </div>

        <div className="border-t pt-4 mt-2">
          <h3 className="text-sm font-semibold mb-3">Dados do Preposto da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.preposto_nome} onChange={(e) => set("preposto_nome", e.target.value)} placeholder="Nome do preposto" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.preposto_email} onChange={(e) => set("preposto_email", e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.preposto_telefone} onChange={(e) => set("preposto_telefone", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createContrato.isPending}>
            {createContrato.isPending ? "Salvando..." : "Salvar Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
