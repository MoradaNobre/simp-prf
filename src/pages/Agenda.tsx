import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, FileText, Wrench, CalendarDays, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useOrdensServico, type OrdemServico } from "@/hooks/useOrdensServico";
import { useAgendamentos, type Agendamento } from "@/hooks/useAgendamentos";
import { DetalhesOSDialog } from "@/components/os/DetalhesOSDialog";
import { AgendamentoDialog } from "@/components/agenda/AgendamentoDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { isFiscalRole } from "@/utils/roles";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguardando Autorização",
  execucao: "Execução", ateste: "Receb. Serviço", faturamento: "Faturamento", pagamento: "Ateste", encerrada: "Encerrada",
};

const visitaStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  agendada: { label: "Agendada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  realizada: { label: "Realizada", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

// Unified calendar event type
interface CalendarEvent {
  id: string;
  data: Date;
  category: "visita" | "prazo_orcamento" | "prazo_execucao";
  label: string;
  sublabel: string;
  osCodigo: string;
  vencido?: boolean;
  diasRestantes?: number;
  // References
  agendamento?: Agendamento;
  os?: OrdemServico;
  prazoTipo?: "orcamento" | "execucao";
  visitaStatus?: string;
}

export default function Agenda() {
  const { data: role } = useUserRole();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [filtroStatusPrazo, setFiltroStatusPrazo] = useState("pendentes");

  // OS dialog
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);

  // Agendamento dialog
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [agendamentoOpen, setAgendamentoOpen] = useState(false);

  const { data: ordensServico = [], isLoading: loadingOS } = useOrdensServico();
  const { data: agendamentos = [], isLoading: loadingVisitas } = useAgendamentos({
    month: currentDate.getMonth(),
    year: currentDate.getFullYear(),
  });

  const isLoading = loadingOS || loadingVisitas;

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build all events
  const allEvents: CalendarEvent[] = useMemo(() => {
    const result: CalendarEvent[] = [];

    // Visitas
    agendamentos.forEach((a) => {
      result.push({
        id: `visita-${a.id}`,
        data: new Date(a.data_agendamento),
        category: "visita",
        label: a.ordens_servico?.codigo || "—",
        sublabel: a.descricao,
        osCodigo: a.ordens_servico?.codigo || "",
        agendamento: a,
        visitaStatus: a.status,
      });
    });

    // Prazos
    ordensServico.forEach((os: any) => {
      if (os.prazo_orcamento && ["orcamento", "autorizacao", "execucao", "ateste", "faturamento", "pagamento", "encerrada"].includes(os.status)) {
        const data = new Date(os.prazo_orcamento + "T12:00:00");
        const vencido = os.status === "orcamento" && isPast(new Date(os.prazo_orcamento + "T23:59:59"));
        result.push({
          id: `prazo-orc-${os.id}`,
          data,
          category: "prazo_orcamento",
          label: os.codigo,
          sublabel: os.titulo,
          osCodigo: os.codigo,
          vencido,
          diasRestantes: differenceInDays(data, hoje),
          os,
          prazoTipo: "orcamento",
        });
      }
      if (os.prazo_execucao && ["execucao", "ateste", "faturamento", "pagamento", "encerrada"].includes(os.status)) {
        const data = new Date(os.prazo_execucao + "T12:00:00");
        const vencido = os.status === "execucao" && isPast(new Date(os.prazo_execucao + "T23:59:59"));
        result.push({
          id: `prazo-exec-${os.id}`,
          data,
          category: "prazo_execucao",
          label: os.codigo,
          sublabel: os.titulo,
          osCodigo: os.codigo,
          vencido,
          diasRestantes: differenceInDays(data, hoje),
          os,
          prazoTipo: "execucao",
        });
      }
    });

    return result;
  }, [agendamentos, ordensServico, hoje]);

  // Filter by active tab and filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      // Tab filter
      if (activeTab === "visitas" && e.category === "visita") return true;
      if (activeTab === "prazos" && (e.category === "prazo_orcamento" || e.category === "prazo_execucao")) {
        // Apply prazo status filter
        if (filtroStatusPrazo === "pendentes") {
          if (e.prazoTipo === "orcamento" && e.os?.status !== "orcamento") return false;
          if (e.prazoTipo === "execucao" && e.os?.status !== "execucao") return false;
        }
        if (filtroStatusPrazo === "vencidos") return !!e.vencido;
        return true;
      }
      if (activeTab === "todos") {
        // For "todos", apply prazo filter only to prazo events
        if (e.category === "visita") return true;
        if (filtroStatusPrazo === "pendentes") {
          if (e.prazoTipo === "orcamento" && e.os?.status !== "orcamento") return false;
          if (e.prazoTipo === "execucao" && e.os?.status !== "execucao") return false;
        }
        if (filtroStatusPrazo === "vencidos" && !e.vencido) return false;
        return true;
      }
      return false;
    });
  }, [allEvents, activeTab, filtroStatusPrazo]);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((e) => {
      const key = format(e.data, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [filteredEvents]);

  const selectedDayEvents = selectedDay
    ? eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  // Stats
  const prazosVencidos = allEvents.filter((e) => e.vencido).length;
  const prazosProximos = allEvents.filter((e) => (e.category === "prazo_orcamento" || e.category === "prazo_execucao") && !e.vencido && e.diasRestantes !== undefined && e.diasRestantes >= 0 && e.diasRestantes <= 3).length;
  const visitasAgendadas = allEvents.filter((e) => e.category === "visita" && e.visitaStatus === "agendada").length;

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handleEventClick = (event: CalendarEvent) => {
    if (event.category === "visita" && event.agendamento) {
      setSelectedAgendamento(event.agendamento);
      setAgendamentoOpen(true);
    } else if (event.os) {
      setSelectedOS(event.os);
      setDetalhesOpen(true);
    }
  };

  const getEventColor = (event: CalendarEvent): string => {
    if (event.category === "visita") {
      if (event.visitaStatus === "realizada") return "bg-emerald-400";
      if (event.visitaStatus === "cancelada") return "bg-red-400";
      return "bg-purple-400";
    }
    if (event.vencido) return "bg-destructive";
    if (event.diasRestantes !== undefined && event.diasRestantes >= 0 && event.diasRestantes <= 3) return "bg-yellow-500";
    if (event.category === "prazo_orcamento") return "bg-orange-400";
    return "bg-blue-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Agenda
          </h1>
          <p className="text-muted-foreground">Visitas técnicas e prazos das Ordens de Serviço</p>
        </div>
        <div className="flex items-center gap-2">
          {(activeTab === "todos" || activeTab === "prazos") && (
            <Select value={filtroStatusPrazo} onValueChange={setFiltroStatusPrazo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendentes">Prazos Pendentes</SelectItem>
                <SelectItem value="vencidos">Prazos Vencidos</SelectItem>
                <SelectItem value="todos">Todos os Prazos</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{prazosVencidos}</p>
              <p className="text-xs text-muted-foreground">Prazos Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{prazosProximos}</p>
              <p className="text-xs text-muted-foreground">Vencendo em 3 dias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{visitasAgendadas}</p>
              <p className="text-xs text-muted-foreground">Visitas Agendadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border shadow-sm">
          <TabsTrigger value="todos" className="data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400">Tudo</TabsTrigger>
          <TabsTrigger value="prazos" className="data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400">Prazos</TabsTrigger>
          <TabsTrigger value="visitas" className="data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400">Visitas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-base capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay.get(key) || [];
                  const isSelected = selectedDay && isSameDay(day, selectedDay);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "relative min-h-[60px] p-1 text-xs border rounded-md transition-colors",
                        !isSameMonth(day, currentDate) && "opacity-30",
                        isToday(day) && "border-primary",
                        isSelected && "bg-primary/10 border-primary",
                        "hover:bg-muted/50"
                      )}
                    >
                      <span className={cn("font-medium", isToday(day) && "text-primary")}>
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <div key={i} className={cn("w-full h-1.5 rounded-full", getEventColor(e))} />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> Visita</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Prazo Orçamento</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Prazo Execução</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive inline-block" /> Vencido</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Próx. vencimento</span>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar - Selected day or upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDay
                  ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR })
                  : "Próximos Eventos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {selectedDay ? (
                selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento nesta data</p>
                ) : (
                  selectedDayEvents.map((e) => (
                    <EventCard key={e.id} event={e} onClick={() => handleEventClick(e)} />
                  ))
                )
              ) : (
                filteredEvents
                  .filter((e) => {
                    if (e.category === "visita") return e.visitaStatus === "agendada";
                    return (e.diasRestantes ?? 0) >= -7;
                  })
                  .sort((a, b) => a.data.getTime() - b.data.getTime())
                  .slice(0, 10)
                  .map((e) => (
                    <EventCard key={e.id} event={e} onClick={() => handleEventClick(e)} showDate />
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <DetalhesOSDialog os={selectedOS} open={detalhesOpen} onOpenChange={setDetalhesOpen} />
      <AgendamentoDialog open={agendamentoOpen} onOpenChange={setAgendamentoOpen} agendamento={selectedAgendamento} />
    </div>
  );
}

function EventCard({ event, onClick, showDate }: { event: CalendarEvent; onClick: () => void; showDate?: boolean }) {
  if (event.category === "visita") {
    const cfg = visitaStatusConfig[event.visitaStatus || "agendada"] || visitaStatusConfig.agendada;
    return (
      <button onClick={onClick} className="w-full text-left rounded-md border p-3 space-y-1 hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium font-mono">{event.osCodigo}</span>
          </div>
          <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{event.sublabel}</p>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px]">Visita</Badge>
          <span className="text-muted-foreground">{format(event.data, "HH:mm")}</span>
          {showDate && <span className="text-muted-foreground">{format(event.data, "dd/MM/yyyy")}</span>}
        </div>
      </button>
    );
  }

  // Prazo event
  return (
    <button onClick={onClick} className="w-full text-left rounded-md border p-3 space-y-1 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {event.prazoTipo === "orcamento" ? (
            <FileText className="h-4 w-4 text-orange-500" />
          ) : (
            <Wrench className="h-4 w-4 text-blue-500" />
          )}
          <span className="text-sm font-medium font-mono">{event.osCodigo}</span>
        </div>
        <Badge
          variant={event.vencido ? "destructive" : (event.diasRestantes ?? 99) <= 3 && (event.diasRestantes ?? 99) >= 0 ? "secondary" : "outline"}
          className="text-[10px]"
        >
          {event.vencido
            ? "VENCIDO"
            : event.diasRestantes === 0
              ? "Hoje"
              : (event.diasRestantes ?? 0) > 0
                ? `${event.diasRestantes}d restantes`
                : `${Math.abs(event.diasRestantes ?? 0)}d atrás`}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground truncate">{event.sublabel}</p>
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[10px]">
          {event.prazoTipo === "orcamento" ? "Prazo Orçamento" : "Prazo Execução"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {statusLabels[event.os?.status || ""] || event.os?.status}
        </Badge>
        {showDate && <span className="text-muted-foreground">{format(event.data, "dd/MM/yyyy")}</span>}
      </div>
    </button>
  );
}
