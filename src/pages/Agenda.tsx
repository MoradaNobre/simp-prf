import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useAgendamentos, type Agendamento } from "@/hooks/useAgendamentos";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendamentoDialog } from "@/components/agenda/AgendamentoDialog";
import { useUserRole } from "@/hooks/useUserRole";

export default function Agenda() {
  const { data: role } = useUserRole();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);

  const canCreate = role === "preposto" || role === "terceirizado" || role === "gestor_master" || role === "gestor_nacional" || role === "gestor_regional" || role === "fiscal_contrato";

  const { data: agendamentos = [], isLoading } = useAgendamentos({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear(),
  });

  const handleSelectAgendamento = (a: Agendamento) => {
    setSelectedAgendamento(a);
    setNewDate(undefined);
    setDialogOpen(true);
  };

  const handleNewAgendamento = (date: Date) => {
    setSelectedAgendamento(null);
    setNewDate(date);
    // Nota: para criar um agendamento pela página geral, o usuário precisa vincular a uma OS.
    // Aqui apenas abrimos o diálogo de edição do agendamento selecionado.
    // A criação de novos agendamentos é feita pela aba da OS.
    // Por ora, mostramos a lista do dia apenas.
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6" /> Agenda de Visitas
          </h1>
          <p className="text-muted-foreground">Calendário de visitas técnicas vinculadas às Ordens de Serviço</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <AgendaCalendar
          agendamentos={agendamentos}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onSelectAgendamento={handleSelectAgendamento}
        />
      )}

      <AgendamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agendamento={selectedAgendamento}
        initialDate={newDate}
      />
    </div>
  );
}
