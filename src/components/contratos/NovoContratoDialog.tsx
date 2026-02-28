import { useState } from "react";
import { isGlobalRole } from "@/utils/roles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContrato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { monitoredInvoke } from "@/utils/monitoredInvoke";
import { useUsersByRole, type UserOption } from "@/hooks/useUsersByRole";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRegionais } from "@/hooks/useHierarchy";
import { useQuery } from "@tanstack/react-query";

export interface NovoContratoInitialValues {
  numero?: string;
  empresa?: string;
  regional_id?: string;
  tipo_servico?: string;
  objeto?: string;
  valor_total?: string;
  data_inicio?: string;
  data_fim?: string;
  preposto_user_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: NovoContratoInitialValues;
}

export function NovoContratoDialog({ open, onOpenChange, initialValues }: Props) {
  const { toast } = useToast();
  const createContrato = useCreateContrato();
  const { data: allRegionais = [] } = useRegionais();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const { data: prepostos = [] } = useUsersByRole(["preposto"]);
  const { data: supridos = [] } = useQuery<UserOption[]>({
    queryKey: ["users-supridos"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .eq("is_suprido", true)
        .order("full_name");
      if (error) throw error;
      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        role: "suprido",
      }));
    },
  });

  const isGlobal = isGlobalRole(role);
  const userRegionais: any[] = (profile as any)?.regionais || [];
  const regionais = isGlobal ? allRegionais : userRegionais;
  const defaultForm = {
    numero: "", empresa: "", regional_id: "", tipo_servico: "manutencao_predial", objeto: "",
    valor_total: "", data_inicio: "", data_fim: "", preposto_user_id: "",
  };
  const [form, setForm] = useState({ ...defaultForm, ...initialValues });

  // Reset form when dialog opens with new initialValues
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setForm({ ...defaultForm, ...initialValues });
  }
  if (open !== lastOpen) setLastOpen(open);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const isCartaoCorporativo = form.tipo_servico === "cartao_corporativo";
  const prepostoOptions = isCartaoCorporativo ? supridos : prepostos;
  const selectedPreposto = prepostoOptions.find((p) => p.user_id === form.preposto_user_id);

  const handleSubmit = async () => {
    if (!form.numero || !form.empresa || !form.data_inicio || !form.data_fim || !form.regional_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      // Fetch preposto email if a preposto is selected
      let prepostoEmail: string | null = null;
      if (form.preposto_user_id && form.preposto_user_id !== "none") {
        const { data: emailMap } = await monitoredInvoke("list-user-emails");
        if (emailMap && emailMap[form.preposto_user_id]) {
          prepostoEmail = emailMap[form.preposto_user_id];
        }
      }

      await createContrato.mutateAsync({
        numero: form.numero.trim(),
        empresa: form.empresa.trim(),
        regional_id: form.regional_id,
        tipo_servico: form.tipo_servico,
        objeto: form.objeto.trim() || null,
        valor_total: parseFloat(form.valor_total) || 0,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
      preposto_user_id: (form.preposto_user_id && form.preposto_user_id !== "none") ? form.preposto_user_id : null,
        preposto_nome: selectedPreposto?.full_name || null,
        preposto_email: prepostoEmail,
        preposto_telefone: selectedPreposto?.phone || null,
      });
      toast({ title: "Contrato cadastrado com sucesso" });
      onOpenChange(false);
      setForm(defaultForm);
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
            <Label>Regional *</Label>
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
                <SelectItem value="cartao_corporativo">Cartão Corporativo</SelectItem>
                <SelectItem value="contrata_brasil">Contrata + Brasil</SelectItem>
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
          <h3 className="text-sm font-semibold mb-3">
            {isCartaoCorporativo ? "Responsável pelo Cartão (Suprido)" : "Preposto da Empresa"}
          </h3>
          <div className="space-y-1.5">
            <Label>{isCartaoCorporativo ? "Selecionar Suprido" : "Selecionar Preposto"}</Label>
            <Select value={form.preposto_user_id} onValueChange={(v) => set("preposto_user_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder={isCartaoCorporativo ? "Selecione um usuário Suprido..." : "Selecione um usuário com perfil de Preposto..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {prepostoOptions.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name}{p.phone ? ` — ${p.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {prepostoOptions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {isCartaoCorporativo
                  ? 'Nenhum usuário com flag "Suprido" cadastrado. Marque o checkbox "Suprido" em Gestão → Usuários.'
                  : 'Nenhum usuário com perfil "Preposto" cadastrado. Cadastre o usuário primeiro em Gestão do Sistema.'}
              </p>
            )}
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
