import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Clock, CheckCircle, XCircle, User, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAgendamentos, type Agendamento } from "@/hooks/useAgendamentos";
import { AgendamentoDialog } from "@/components/agenda/AgendamentoDialog";
import { useUserRole } from "@/hooks/useUserRole";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  agendada: { label: "Agendada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  realizada: { label: "Realizada", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

interface Props {
  osId: string;
  osCodigo: string;
  osStatus: string;
}

export function OSAgendamentosTab({ osId, osCodigo, osStatus }: Props) {
  const { data: role } = useUserRole();
  const { data: agendamentos = [], isLoading } = useAgendamentos({ osId });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);

  const canCreate = osStatus === "execucao" && (role === "preposto" || role === "terceirizado" || role === "gestor_master" || role === "gestor_nacional" || role === "gestor_regional" || role === "fiscal_contrato");

  const handleNew = () => {
    setSelectedAgendamento(null);
    setDialogOpen(true);
  };

  const handleEdit = (a: Agendamento) => {
    setSelectedAgendamento(a);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Agendamentos ({agendamentos.length})
        </h3>
        {canCreate && (
          <Button size="sm" variant="destructive" onClick={handleNew} className="font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agendar Visita
          </Button>
        )}
      </div>

      {!canCreate && osStatus !== "execucao" && (
        <p className="text-xs text-muted-foreground">Agendamentos disponíveis apenas quando a OS está em Execução.</p>
      )}

      {agendamentos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum agendamento registrado para esta OS.</p>
      ) : (
        <div className="space-y-2">
          {agendamentos.map((a) => {
            const cfg = statusConfig[a.status] || statusConfig.agendada;
            const Icon = cfg.icon;
            return (
              <div
                key={a.id}
                onClick={() => handleEdit(a)}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {format(new Date(a.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.descricao}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" /> {a.responsavel_tecnico}
                  </div>
                  {a.observacoes_pos_visita && (
                    <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-muted pl-2">
                      {a.observacoes_pos_visita}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AgendamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agendamento={selectedAgendamento}
        osId={osId}
        osCodigo={osCodigo}
      />
    </div>
  );
}
