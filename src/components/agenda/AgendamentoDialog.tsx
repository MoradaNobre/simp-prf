import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateAgendamento, useUpdateAgendamento, useDeleteAgendamento, type Agendamento } from "@/hooks/useAgendamentos";
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

export function AgendamentoDialog({ open, onOpenChange, agendamento, osId, osCodigo, initialDate }: Props) {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const createMut = useCreateAgendamento();
  const updateMut = useUpdateAgendamento();
  const deleteMut = useDeleteAgendamento();

  const isEdit = !!agendamento;
  const isGestorOrFiscal = role === "gestor_master" || role === "gestor_nacional" || role === "gestor_regional" || isFiscalRole(role);
  const canEdit = isGestorOrFiscal || role === "preposto" || role === "terceirizado";

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hora, setHora] = useState("08:00");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("agendada");
  const [observacoes, setObservacoes] = useState("");

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
  }, [agendamento, initialDate, open]);

  const handleSave = async () => {
    if (!descricao.trim() || !responsavel.trim() || !date) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const [h, m] = hora.split(":").map(Number);
    const dataAgendamento = new Date(date);
    dataAgendamento.setHours(h, m, 0, 0);

    try {
      if (isEdit && agendamento) {
        await updateMut.mutateAsync({
          id: agendamento.id,
          data_agendamento: dataAgendamento.toISOString(),
          descricao: descricao.trim(),
          responsavel_tecnico: responsavel.trim(),
          status,
          observacoes_pos_visita: observacoes.trim() || null,
        });
        toast.success("Agendamento atualizado!");
      } else {
        const targetOsId = osId || agendamento?.os_id;
        if (!targetOsId || !user?.id) {
          toast.error("OS não identificada.");
          return;
        }
        await createMut.mutateAsync({
          os_id: targetOsId,
          data_agendamento: dataAgendamento.toISOString(),
          descricao: descricao.trim(),
          responsavel_tecnico: responsavel.trim(),
          created_by: user.id,
        });
        toast.success("Agendamento criado!");
      }
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

  const loading = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
