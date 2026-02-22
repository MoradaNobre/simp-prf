import { cn } from "@/lib/utils";
import {
  FileText, Calculator, ShieldCheck, Wrench, Camera, Receipt, DollarSign, CheckCircle,
} from "lucide-react";

const statusFlow = [
  "aberta", "orcamento", "autorizacao", "execucao", "ateste", "faturamento", "pagamento", "encerrada",
] as const;

const stepConfig: Record<string, { label: string; desc: string; icon: React.ElementType; color: string; activeColor: string }> = {
  aberta: {
    label: "Aberta",
    desc: "Vinculação de contrato",
    icon: FileText,
    color: "from-sky-400 to-sky-500",
    activeColor: "bg-sky-500",
  },
  orcamento: {
    label: "Orçamento",
    desc: "Upload obrigatório",
    icon: Calculator,
    color: "from-sky-500 to-blue-600",
    activeColor: "bg-blue-600",
  },
  autorizacao: {
    label: "Autorização",
    desc: "Aplicação dos bloqueios",
    icon: ShieldCheck,
    color: "from-blue-600 to-blue-700",
    activeColor: "bg-blue-700",
  },
  execucao: {
    label: "Execução",
    desc: "Relatório PDF Automático",
    icon: Wrench,
    color: "from-amber-400 to-amber-500",
    activeColor: "bg-amber-500",
  },
  ateste: {
    label: "Ateste",
    desc: 'Upload Foto "Depois"',
    icon: Camera,
    color: "from-emerald-500 to-emerald-600",
    activeColor: "bg-emerald-500",
  },
  faturamento: {
    label: "Faturamento",
    desc: "Aprovação de NF",
    icon: Receipt,
    color: "from-emerald-600 to-emerald-700",
    activeColor: "bg-emerald-600",
  },
  pagamento: {
    label: "Pagamento",
    desc: "Documentos fiscais",
    icon: DollarSign,
    color: "from-emerald-700 to-teal-700",
    activeColor: "bg-teal-700",
  },
  encerrada: {
    label: "Encerrada",
    desc: "Assinatura Digital",
    icon: CheckCircle,
    color: "from-purple-500 to-purple-600",
    activeColor: "bg-purple-600",
  },
};

interface Props {
  currentStatus: string;
}

export function OSStatusStepper({ currentStatus }: Props) {
  const currentIdx = statusFlow.indexOf(currentStatus as any);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-stretch min-w-[700px]">
        {statusFlow.map((s, i) => {
          const config = stepConfig[s];
          const Icon = config.icon;
          const isCurrent = s === currentStatus;
          const isPast = i < currentIdx;
          const isFuture = i > currentIdx;
          const isFirst = i === 0;
          const isLast = i === statusFlow.length - 1;

          return (
            <div key={s} className="flex-1 flex items-stretch relative" style={{ minWidth: 80 }}>
              {/* Chevron shape via SVG clip-path */}
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center text-center w-full py-3 px-2 transition-all",
                  isCurrent && `bg-gradient-to-br ${config.color} text-white shadow-lg`,
                  isPast && "bg-muted/80 text-muted-foreground",
                  isFuture && "bg-muted/40 text-muted-foreground/50",
                  isFirst && "rounded-l-lg",
                  isLast && "rounded-r-lg",
                )}
                style={{
                  clipPath: isLast
                    ? "polygon(8% 0%, 100% 0%, 100% 100%, 8% 100%, 0% 50%)"
                    : isFirst
                    ? "polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%)"
                    : "polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)",
                }}
              >
                <div
                  className={cn(
                    "rounded-full p-1.5 mb-1",
                    isCurrent ? "bg-white/25" : isPast ? "bg-primary/10" : "bg-muted",
                  )}
                >
                  <Icon className={cn("h-4 w-4", isCurrent ? "text-white" : isPast ? "text-primary" : "text-muted-foreground/40")} />
                </div>
                <span className={cn("text-[11px] font-bold leading-tight", isCurrent && "text-white", isPast && "line-through opacity-70")}>
                  {config.label}
                </span>
                <span className={cn("text-[9px] leading-tight mt-0.5 max-w-[90px]", isCurrent ? "text-white/80" : "opacity-60")}>
                  {config.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
