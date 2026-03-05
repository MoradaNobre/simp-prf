import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Trash2, Plus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateAgendamento, useUpdateAgendamento, useDeleteAgendamento, useAgendamentoParticipantes, useSaveParticipantes, type Agendamento, type Participante } from "@/hooks/useAgendamentos";
import { isFiscalRole } from "@/utils/roles";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento?: Agendamento | null;
  osId?: string;
  osCodigo?: string;
  initialDate?: Date;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function AgendamentoDialog({ open, onOpenChange, agendamento, osId, osCodigo, initialDate }: Props) {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const createMut = useCreateAgendamento();
  const updateMut = useUpdateAgendamento();
  const deleteMut = useDeleteAgendamento();
  const saveParticipantesMut = useSaveParticipantes();

  const isEdit = !!agendamento;
  const isGestorOrFiscal = role === "gestor_master" || role === "gestor_nacional" || role === "gestor_regional" || isFiscalRole(role);
  const canEdit = isGestorOrFiscal || role === "preposto" || role === "terceirizado";

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("08:00");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("agendada");
  const [observacoes, setObservacoes] = useState("");

  // Participantes state
  const [participantes, setParticipantes] = useState<{ nome: string; cpf: string }[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoCpf, setNovoCpf] = useState("");
  const participantesListRef = useRef<HTMLDivElement>(null);

  // Load existing participantes when editing
  const { data: existingParticipantes } = useAgendamentoParticipantes(agendamento?.id);

  useEffect(() => {
    if (agendamento) {
      const d = new Date(agendamento.data_agendamento);
      setDate(d);
      setHora(format(d, "HH:mm"));
      setDescricao(agendamento.descricao);
      setResponsavel(agendamento.responsavel_tecnico);
      setStatus(agendamento.status);
      setObservacoes(agendamento.observacoes_pos_visita || "");
    } else {
      setDate(initialDate || new Date());
      setHora("08:00");
      setDescricao("");
      setResponsavel("");
      setStatus("agendada");
      setObservacoes("");
    }
    setNovoNome("");
    setNovoCpf("");
  }, [agendamento, initialDate, open]);

  // Sync existing participantes into local state when loaded
  useEffect(() => {
    if (!open) return;

    if (!isEdit) {
      setParticipantes([]);
      return;
    }

    const mapped = (existingParticipantes ?? []).map((p) => ({ nome: p.nome, cpf: p.cpf }));
    setParticipantes(mapped);
  }, [existingParticipantes, isEdit, open]);

  const handleAddParticipante = () => {
    const nome = novoNome.trim();
    const cpfDigits = novoCpf.replace(/\D/g, "");
    if (!nome) { toast.error("Informe o nome do participante."); return; }
    if (cpfDigits.length !== 11) { toast.error("CPF deve ter 11 dígitos."); return; }
    setParticipantes(prev => [...prev, { nome, cpf: formatCpf(cpfDigits) }]);
    setNovoNome("");
    setNovoCpf("");
    toast.success(`Participante "${nome}" adicionado.`);
    setTimeout(() => participantesListRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  };

  const handleRemoveParticipante = (index: number) => {
    setParticipantes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!descricao.trim() || !responsavel.trim() || !date) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const [h, m] = hora.split(":").map(Number);
    const dataAgendamento = new Date(date);
    dataAgendamento.setHours(h, m, 0, 0);

    try {
      let agendamentoId: string;

      if (isEdit && agendamento) {
        await updateMut.mutateAsync({
          id: agendamento.id,
          data_agendamento: dataAgendamento.toISOString(),
          descricao: descricao.trim(),
          responsavel_tecnico: responsavel.trim(),
          status,
          observacoes_pos_visita: observacoes.trim() || null,
        });
        agendamentoId = agendamento.id;
        toast.success("Agendamento atualizado!");
      } else {
        const targetOsId = osId || agendamento?.os_id;
        if (!targetOsId || !user?.id) {
          toast.error("OS não identificada.");
          return;
        }
        const result = await createMut.mutateAsync({
          os_id: targetOsId,
          data_agendamento: dataAgendamento.toISOString(),
          descricao: descricao.trim(),
          responsavel_tecnico: responsavel.trim(),
          created_by: user.id,
        });
        agendamentoId = result.id;
        toast.success("Agendamento criado!");
      }

      // Save participantes
      await saveParticipantesMut.mutateAsync({
        agendamentoId,
        participantes,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar agendamento.");
    }
  };

  const handleDelete = async () => {
    if (!agendamento) return;
    if (!confirm("Deseja realmente excluir este agendamento?")) return;
    try {
      await deleteMut.mutateAsync(agendamento.id);
      toast.success("Agendamento excluído.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    }
  };

  const loading = createMut.isPending || updateMut.isPending || deleteMut.isPending || saveParticipantesMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          {(osCodigo || agendamento?.ordens_servico?.codigo) && (
            <Badge variant="outline" className="w-fit">{osCodigo || agendamento?.ordens_servico?.codigo}</Badge>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Horário *</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          {/* Descricao */}
          <div>
            <Label>Descrição da atividade *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a atividade a ser realizada" rows={3} maxLength={500} />
          </div>

          {/* Responsavel */}
          <div>
            <Label>Responsável técnico *</Label>
            <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do técnico responsável" maxLength={200} />
          </div>

          {/* Participantes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Participantes da visita
              {participantes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{participantes.length}</Badge>
              )}
            </Label>

            {canEdit && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="Nome completo"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    maxLength={150}
                  />
                </div>
                <div className="w-[160px]">
                  <Input
                    placeholder="CPF"
                    value={novoCpf}
                    onChange={(e) => setNovoCpf(formatCpf(e.target.value))}
                    maxLength={14}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleAddParticipante}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {participantes.length > 0 && (
              <div ref={participantesListRef} className="space-y-1.5 border rounded-md p-2 bg-muted/30">
                {participantes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-background rounded-md px-3 py-1.5 border">
                    <span className="flex-1 truncate font-medium">{p.nome}</span>
                    <span className="text-muted-foreground font-mono text-xs">{p.cpf}</span>
                    {canEdit && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => handleRemoveParticipante(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {participantes.length === 0 && !canEdit && (
              <p className="text-xs text-muted-foreground">Nenhum participante registrado.</p>
            )}
          </div>

          {/* Status (only on edit) */}
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Observacoes pos-visita */}
          {isEdit && (
            <div>
              <Label>Observações pós-visita</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Registre observações após a realização da visita" rows={3} maxLength={1000} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            {isEdit && canEdit && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              {canEdit && (
                <Button onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {isEdit ? "Salvar" : "Agendar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
