import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isPast, isFuture, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CheckCircle, FileText, Wrench, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useOrdensServico, type OrdemServico } from "@/hooks/useOrdensServico";
import { DetalhesOSDialog } from "@/components/os/DetalhesOSDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguardando Autorização",
  execucao: "Execução", ateste: "Receb. Serviço", faturamento: "Faturamento", pagamento: "Ateste", encerrada: "Encerrada",
};

interface PrazoEvent {
  os: OrdemServico;
  tipo: "orcamento" | "execucao";
  data: Date;
  vencido: boolean;
  diasRestantes: number;
}

export default function AgendaPrazos() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("pendentes");
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);

  const { data: ordensServico = [], isLoading } = useOrdensServico();

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build prazo events from OS data
  const eventos: PrazoEvent[] = useMemo(() => {
    const result: PrazoEvent[] = [];
    ordensServico.forEach((os: any) => {
      if (os.prazo_orcamento && ["orcamento", "autorizacao", "execucao", "ateste", "faturamento", "pagamento", "encerrada"].includes(os.status)) {
        const data = new Date(os.prazo_orcamento + "T12:00:00");
        const vencido = os.status === "orcamento" && isPast(new Date(os.prazo_orcamento + "T23:59:59"));
        result.push({
          os,
          tipo: "orcamento",
          data,
          vencido,
          diasRestantes: differenceInDays(data, hoje),
        });
      }
      if (os.prazo_execucao && ["execucao", "ateste", "faturamento", "pagamento", "encerrada"].includes(os.status)) {
        const data = new Date(os.prazo_execucao + "T12:00:00");
        const vencido = os.status === "execucao" && isPast(new Date(os.prazo_execucao + "T23:59:59"));
        result.push({
          os,
          tipo: "execucao",
          data,
          vencido,
          diasRestantes: differenceInDays(data, hoje),
        });
      }
    });
    return result;
  }, [ordensServico, hoje]);

  // Filter events
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) => {
      if (filtroTipo !== "todos" && e.tipo !== filtroTipo) return false;
      if (filtroStatus === "pendentes") {
        // Only OS still in the relevant status
        if (e.tipo === "orcamento" && e.os.status !== "orcamento") return false;
        if (e.tipo === "execucao" && e.os.status !== "execucao") return false;
      }
      if (filtroStatus === "vencidos") {
        return e.vencido;
      }
      return true;
    });
  }, [eventos, filtroTipo, filtroStatus]);

  // Calendar data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventosByDay = useMemo(() => {
    const map = new Map<string, PrazoEvent[]>();
    eventosFiltrados.forEach((e) => {
      const key = format(e.data, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [eventosFiltrados]);

  const selectedDayEventos = selectedDay
    ? eventosByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  // Summary stats
  const vencidos = eventosFiltrados.filter((e) => e.vencido).length;
  const proximosVencer = eventosFiltrados.filter((e) => !e.vencido && e.diasRestantes >= 0 && e.diasRestantes <= 3).length;
  const pendentes = eventosFiltrados.filter((e) => {
    if (e.tipo === "orcamento") return e.os.status === "orcamento";
    if (e.tipo === "execucao") return e.os.status === "execucao";
    return false;
  }).length;

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Agenda de Prazos
          </h1>
          <p className="text-muted-foreground">Prazos de orçamento e execução das Ordens de Serviço</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Prazos</SelectItem>
              <SelectItem value="orcamento">Prazo Orçamento</SelectItem>
              <SelectItem value="execucao">Prazo Execução</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendentes">Pendentes</SelectItem>
              <SelectItem value="vencidos">Vencidos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
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
              <p className="text-2xl font-bold text-destructive">{vencidos}</p>
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
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{proximosVencer}</p>
              <p className="text-xs text-muted-foreground">Vencendo em 3 dias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Prazos Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  const dayEvents = eventosByDay.get(key) || [];
                  const hasVencido = dayEvents.some((e) => e.vencido);
                  const hasProximo = dayEvents.some((e) => !e.vencido && e.diasRestantes >= 0 && e.diasRestantes <= 3);
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
                            <div
                              key={i}
                              className={cn(
                                "w-full h-1.5 rounded-full",
                                e.vencido ? "bg-destructive" :
                                e.diasRestantes >= 0 && e.diasRestantes <= 3 ? "bg-yellow-500" :
                                e.tipo === "orcamento" ? "bg-orange-400" : "bg-blue-400"
                              )}
                            />
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
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive inline-block" /> Vencido</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Próximo ao vencimento</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Prazo Orçamento</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Prazo Execução</span>
              </div>
            </CardContent>
          </Card>

          {/* Selected day detail / upcoming list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDay
                  ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR })
                  : "Próximos Prazos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {selectedDay ? (
                selectedDayEventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum prazo nesta data</p>
                ) : (
                  selectedDayEventos.map((e, i) => (
                    <PrazoCard key={i} evento={e} onClickOS={(os) => { setSelectedOS(os); setDetalhesOpen(true); }} />
                  ))
                )
              ) : (
                // Show upcoming deadlines
                eventosFiltrados
                  .filter((e) => e.diasRestantes >= -7)
                  .sort((a, b) => a.data.getTime() - b.data.getTime())
                  .slice(0, 10)
                  .map((e, i) => (
                    <PrazoCard key={i} evento={e} showDate onClickOS={(os) => { setSelectedOS(os); setDetalhesOpen(true); }} />
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <DetalhesOSDialog os={selectedOS} open={detalhesOpen} onOpenChange={setDetalhesOpen} />
    </div>
  );
}

function PrazoCard({ evento, showDate, onClickOS }: { evento: PrazoEvent; showDate?: boolean; onClickOS: (os: OrdemServico) => void }) {
  return (
    <button
      onClick={() => onClickOS(evento.os)}
      className="w-full text-left rounded-md border p-3 space-y-1 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {evento.tipo === "orcamento" ? (
            <FileText className="h-4 w-4 text-orange-500" />
          ) : (
            <Wrench className="h-4 w-4 text-blue-500" />
          )}
          <span className="text-sm font-medium font-mono">{evento.os.codigo}</span>
        </div>
        <Badge
          variant={evento.vencido ? "destructive" : evento.diasRestantes <= 3 && evento.diasRestantes >= 0 ? "secondary" : "outline"}
          className="text-[10px]"
        >
          {evento.vencido
            ? "VENCIDO"
            : evento.diasRestantes === 0
              ? "Hoje"
              : evento.diasRestantes > 0
                ? `${evento.diasRestantes}d restantes`
                : `${Math.abs(evento.diasRestantes)}d atrás`}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground truncate">{evento.os.titulo}</p>
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="text-[10px]">
          {evento.tipo === "orcamento" ? "Prazo Orçamento" : "Prazo Execução"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {statusLabels[evento.os.status] || evento.os.status}
        </Badge>
        {showDate && (
          <span className="text-muted-foreground">
            {format(evento.data, "dd/MM/yyyy")}
          </span>
        )}
      </div>
    </button>
  );
}
