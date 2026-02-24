import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Agendamento } from "@/hooks/useAgendamentos";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  agendada: { label: "Agendada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  realizada: { label: "Realizada", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

interface Props {
  agendamentos: Agendamento[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectAgendamento: (a: Agendamento) => void;
  onNewAgendamento?: (date: Date) => void;
}

export function AgendaCalendar({ agendamentos, currentDate, onDateChange, onSelectAgendamento, onNewAgendamento }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const agendamentosByDay = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    agendamentos.forEach((a) => {
      const key = format(new Date(a.data_agendamento), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [agendamentos]);

  const selectedDayAgendamentos = selectedDay
    ? agendamentosByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onDateChange(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => onDateChange(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => { onDateChange(new Date()); setSelectedDay(new Date()); }}>
          Hoje
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAgendamentos = agendamentosByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative min-h-[80px] sm:min-h-[100px] border-b border-r p-1 text-left transition-colors hover:bg-muted/30",
                  !inMonth && "bg-muted/20 text-muted-foreground/40",
                  isSelected && "bg-primary/5 ring-2 ring-primary/30 ring-inset",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayAgendamentos.slice(0, 3).map((a) => {
                    const cfg = statusConfig[a.status] || statusConfig.agendada;
                    return (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onSelectAgendamento(a); }}
                        className={cn("text-[10px] leading-tight truncate rounded px-1 py-0.5 cursor-pointer hover:opacity-80", cfg.color)}
                        title={`${format(new Date(a.data_agendamento), "HH:mm")} - ${a.descricao}`}
                      >
                        {format(new Date(a.data_agendamento), "HH:mm")} {a.ordens_servico?.codigo || ""}
                      </div>
                    );
                  })}
                  {dayAgendamentos.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayAgendamentos.length - 3}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>
              {onNewAgendamento && (
                <Button size="sm" variant="outline" onClick={() => onNewAgendamento(selectedDay)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agendar
                </Button>
              )}
            </div>
            {selectedDayAgendamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayAgendamentos.map((a) => {
                  const cfg = statusConfig[a.status] || statusConfig.agendada;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelectAgendamento(a)}
                      className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{format(new Date(a.data_agendamento), "HH:mm")}</span>
                          <Badge variant="outline" className="text-[10px]">{a.ordens_servico?.codigo}</Badge>
                          <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{a.descricao}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" /> {a.responsavel_tecnico}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
