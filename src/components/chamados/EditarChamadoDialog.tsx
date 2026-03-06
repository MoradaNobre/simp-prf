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
import { useUpdateChamado, type Chamado } from "@/hooks/useChamados";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface Props {
  chamado: Chamado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS_DEMANDA = [
  { value: "hidraulico", label: "Sistema Hidráulico" },
  { value: "eletrico", label: "Sistema Elétrico" },
  { value: "iluminacao", label: "Iluminação" },
  { value: "incendio", label: "Incêndio" },
  { value: "estrutura", label: "Estrutura" },
  { value: "rede_logica", label: "Rede Lógica" },
  { value: "elevadores", label: "Elevadores" },
  { value: "ar_condicionado", label: "Ar Condicionado" },
  { value: "instalacoes_diversas", label: "Instalações Diversas" },
  { value: "controle_pragas", label: "Controle de Pragas" },
];

export function EditarChamadoDialog({ chamado, open, onOpenChange }: Props) {
  const updateChamado = useUpdateChamado();

  const [tipoDemanda, setTipoDemanda] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localServico, setLocalServico] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [justificativaUrgente, setJustificativaUrgente] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (chamado) {
      setTipoDemanda(chamado.tipo_demanda);
      setDescricao(chamado.descricao);
      setLocalServico(chamado.local_servico);
      setPrioridade(chamado.prioridade);
      setJustificativaUrgente(chamado.justificativa_urgente || "");
    }
  }, [chamado]);

  const handleSubmit = async () => {
    if (!chamado || !tipoDemanda || !descricao.trim() || !localServico.trim()) return;
    if (prioridade === "urgente" && !justificativaUrgente.trim()) return;
    setSubmitting(true);
    try {
      await updateChamado.mutateAsync({
        id: chamado.id,
        tipo_demanda: tipoDemanda,
        descricao: descricao.trim(),
        local_servico: localServico.trim(),
        prioridade,
        justificativa_urgente: prioridade === "urgente" ? justificativaUrgente.trim() : null,
      });
      toast.success("Chamado atualizado com sucesso!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar chamado: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Chamado {chamado?.codigo}</DialogTitle>
          <DialogDescription>Altere os dados do chamado. Apenas chamados abertos podem ser editados.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Demanda *</Label>
            <Select value={tipoDemanda} onValueChange={setTipoDemanda}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_DEMANDA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o problema..." rows={3} />
          </div>

          <div>
            <Label>Setor / Andar / Sala *</Label>
            <Input value={localServico} onChange={(e) => setLocalServico(e.target.value)} placeholder="Ex: Bloco A, 2º andar, Sala 205" />
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

          {prioridade === "urgente" && (
            <div>
              <Label>Justificativa de Urgência *</Label>
              <Textarea value={justificativaUrgente} onChange={(e) => setJustificativaUrgente(e.target.value)} placeholder="Descreva o motivo da prioridade urgente..." rows={2} />
              {!justificativaUrgente.trim() && (
                <p className="text-xs text-destructive mt-1">A justificativa é obrigatória para prioridade urgente.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !tipoDemanda || !descricao.trim() || !localServico.trim() || (prioridade === "urgente" && !justificativaUrgente.trim())}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
