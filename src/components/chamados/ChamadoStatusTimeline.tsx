import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Link2, FileText, ArrowRight, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Chamado } from "@/hooks/useChamados";

interface Props {
  chamado: Chamado;
  osData?: {
    codigo: string;
    status: string;
    titulo: string;
  } | null;
}

const OS_STATUS_FLOW = [
  { key: "aberta", label: "Aberta" },
  { key: "orcamento", label: "Orçamento" },
  { key: "autorizacao", label: "Autorização" },
  { key: "execucao", label: "Execução" },
  { key: "ateste", label: "Ateste" },
  { key: "faturamento", label: "Faturamento" },
  { key: "pagamento", label: "Pagamento" },
  { key: "encerrada", label: "Encerrada" },
];

const CHAMADO_STEPS = [
  { key: "aberto", label: "Aberto", icon: Clock, color: "text-blue-500" },
  { key: "analisado", label: "Analisado (GUT)", icon: ClipboardCheck, color: "text-amber-500" },
  { key: "vinculado", label: "Vinculado a OS", icon: Link2, color: "text-green-500" },
];

export function ChamadoStatusTimeline({ chamado, osData }: Props) {
  const currentStepIdx = CHAMADO_STEPS.findIndex(s => s.key === chamado.status);
  const osStatusIndex = osData ? OS_STATUS_FLOW.findIndex(s => s.key === osData.status) : -1;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" /> Acompanhamento
      </h4>

      {/* Chamado flow stepper */}
      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {CHAMADO_STEPS.map((step, i) => {
          const isCompleted = i < currentStepIdx;
          const isCurrent = i === currentStepIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center gap-1 shrink-0">
              {i > 0 && (
                <ArrowRight className={`h-3 w-3 ${isCompleted || isCurrent ? "text-primary" : "text-muted-foreground/30"}`} />
              )}
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground/50"
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className={`h-3 w-3 ${isCurrent ? "fill-current" : ""}`} />
                )}
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* GUT score info */}
      {chamado.gut_score != null && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border text-sm">
          <ClipboardCheck className="h-4 w-4 text-amber-500" />
          <span className="font-medium">Score GUT: {chamado.gut_score}</span>
          <span className="text-muted-foreground text-xs">
            (G:{chamado.gut_gravidade} × U:{chamado.gut_urgencia} × T:{chamado.gut_tendencia})
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Aberto em {format(new Date(chamado.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </p>

      {/* OS progress */}
      {chamado.status === "vinculado" && osData && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">OS {osData.codigo}</span>
            <span className="text-muted-foreground">— {osData.titulo}</span>
          </div>

          {/* OS flow stepper */}
          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {OS_STATUS_FLOW.map((step, i) => {
              const isCompleted = i <= osStatusIndex;
              const isCurrent = i === osStatusIndex;
              return (
                <div key={step.key} className="flex items-center gap-1 shrink-0">
                  {i > 0 && (
                    <ArrowRight className={`h-3 w-3 ${isCompleted ? "text-primary" : "text-muted-foreground/30"}`} />
                  )}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground/50"
                  }`}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Circle className={`h-3 w-3 ${isCurrent ? "fill-current" : ""}`} />
                    )}
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chamado.status === "cancelado" && (
        <p className="text-sm text-muted-foreground">Este chamado foi cancelado.</p>
      )}
    </div>
  );
}
