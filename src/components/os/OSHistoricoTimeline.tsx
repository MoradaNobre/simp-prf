import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  orcamento: "Orçamento",
  autorizacao: "Autorização",
  execucao: "Execução",
  ateste: "Receb. Serviço",
  faturamento: "Faturamento",
  pagamento: "Ateste",
  encerrada: "Encerrada",
};

const statusColors: Record<string, string> = {
  aberta: "bg-sky-500",
  orcamento: "bg-blue-600",
  autorizacao: "bg-blue-700",
  execucao: "bg-amber-500",
  ateste: "bg-emerald-500",
  faturamento: "bg-emerald-600",
  pagamento: "bg-teal-700",
  encerrada: "bg-purple-600",
};

interface TransitionItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  description: string;
  dateTime: string;
  dateRaw: Date;
  userName: string;
  tempoNaEtapa: string | null;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function extractStatus(data: any): string {
  if (!data) return "—";
  const raw = typeof data === "string" ? JSON.parse(data) : data;
  return raw?.status || "—";
}

interface Props {
  osId: string;
  osCodigo: string;
  dataAbertura: string;
}

export function OSHistoricoTimeline({ osId, osCodigo, dataAbertura }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: transitions = [], isLoading } = useQuery({
    queryKey: ["os-historico-timeline", osId],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("id, action, description, created_at, user_id, old_data, new_data")
        .eq("record_id", osId)
        .eq("table_name", "ordens_servico")
        .in("action", ["STATUS_CHANGE", "restituicao"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Resolve user names
      const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      const abertura = new Date(dataAbertura);
      const items: TransitionItem[] = logs.map((log, idx) => {
        const fromStatus = extractStatus(log.old_data);
        const toStatus = extractStatus(log.new_data);
        const dateRaw = new Date(log.created_at);
        const prevDate = idx === 0 ? abertura : new Date(logs[idx - 1].created_at);
        const delta = dateRaw.getTime() - prevDate.getTime();

        return {
          id: log.id,
          fromStatus,
          toStatus,
          action: log.action === "restituicao" ? "Restituição" : "Transição",
          description: log.description || "",
          dateTime: dateRaw.toLocaleString("pt-BR"),
          dateRaw,
          userName: log.user_id ? (profileMap[log.user_id] || "Não identificado") : "Sistema",
          tempoNaEtapa: delta > 0 ? formatDuration(delta) : null,
        };
      });

      return items;
    },
    enabled: !!osId && isOpen,
  });

  const exportCSV = () => {
    if (transitions.length === 0) return;
    const header = "Etapa De;Etapa Para;Data/Hora;Responsável;Tempo na Etapa;Ação\n";
    const rows = transitions.map(t =>
      `${statusLabels[t.fromStatus] || t.fromStatus};${statusLabels[t.toStatus] || t.toStatus};${t.dateTime};${t.userName};${t.tempoNaEtapa || "—"};${t.action}`
    ).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Historico_${osCodigo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico do Fluxo (Timeline IMR)
          </span>
          <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando histórico...</p>}

        {!isLoading && transitions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma transição registrada ainda.</p>
        )}

        {transitions.length > 0 && (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-3 w-3 mr-1" />
                Exportar CSV (IMR)
              </Button>
            </div>

            <div className="relative border-l-2 border-muted ml-3 space-y-4">
              {transitions.map((t) => (
                <div key={t.id} className="relative pl-6">
                  {/* Dot */}
                  <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${
                    t.action === "Restituição" ? "bg-destructive" : (statusColors[t.toStatus] || "bg-muted-foreground")
                  }`} />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {statusLabels[t.fromStatus] || t.fromStatus}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant={t.action === "Restituição" ? "destructive" : "default"} className="text-xs">
                        {statusLabels[t.toStatus] || t.toStatus}
                      </Badge>
                      {t.tempoNaEtapa && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          ⏱ {t.tempoNaEtapa}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.dateTime} — <span className="font-medium text-foreground">{t.userName}</span>
                    </p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground italic">{t.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
