import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GRAVIDADE_LABELS = [
  { value: 1, label: "Sem gravidade", desc: "Dano mínimo" },
  { value: 2, label: "Pouco grave", desc: "Dano leve" },
  { value: 3, label: "Grave", desc: "Dano regular" },
  { value: 4, label: "Muito grave", desc: "Grande dano" },
  { value: 5, label: "Extremamente grave", desc: "Dano gravíssimo" },
];

const URGENCIA_LABELS = [
  { value: 1, label: "Pode esperar", desc: "Sem pressa" },
  { value: 2, label: "Pouco urgente", desc: "Pode aguardar" },
  { value: 3, label: "Urgente", desc: "O mais rápido" },
  { value: 4, label: "Muito urgente", desc: "Ação imediata" },
  { value: 5, label: "Ação imediata", desc: "Não pode esperar" },
];

const TENDENCIA_LABELS = [
  { value: 1, label: "Não piora", desc: "Estável" },
  { value: 2, label: "Piora a longo prazo", desc: "Lento" },
  { value: 3, label: "Piora a médio prazo", desc: "Moderado" },
  { value: 4, label: "Piora a curto prazo", desc: "Rápido" },
  { value: 5, label: "Piora rapidamente", desc: "Imediato" },
];

function getScoreColor(score: number) {
  if (score >= 64) return "bg-destructive text-destructive-foreground";
  if (score >= 27) return "bg-orange-500 text-white";
  if (score >= 8) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
}

function getScoreLabel(score: number) {
  if (score >= 64) return "Urgente";
  if (score >= 27) return "Alta";
  if (score >= 8) return "Média";
  return "Baixa";
}

interface GUTMatrixPanelProps {
  gravidade?: number | null;
  urgencia?: number | null;
  tendencia?: number | null;
  score?: number | null;
  editable?: boolean;
  onChange?: (values: { gut_gravidade: number; gut_urgencia: number; gut_tendencia: number }) => void;
}

function ScaleSelector({
  label,
  icon,
  items,
  value,
  onChange,
  editable,
  color,
}: {
  label: string;
  icon: string;
  items: { value: number; label: string; desc: string }[];
  value: number;
  onChange: (v: number) => void;
  editable: boolean;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </Label>
      <div className="flex gap-1">
        {items.map((item) => {
          const isSelected = value === item.value;
          return (
            <button
              key={item.value}
              type="button"
              disabled={!editable}
              onClick={() => onChange(item.value)}
              title={`${item.value} — ${item.label}: ${item.desc}`}
              className={cn(
                "flex-1 rounded-md py-2 px-1 text-center transition-all border text-xs font-medium",
                isSelected
                  ? `${color} border-transparent shadow-sm`
                  : "bg-muted/50 border-border hover:bg-muted text-muted-foreground",
                !editable && "cursor-default opacity-80",
                editable && !isSelected && "cursor-pointer hover:scale-105",
              )}
            >
              <div className="text-sm font-bold">{item.value}</div>
              <div className="text-[10px] leading-tight mt-0.5 hidden sm:block">{item.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GUTMatrixPanel({
  gravidade,
  urgencia,
  tendencia,
  score,
  editable = false,
  onChange,
}: GUTMatrixPanelProps) {
  const [g, setG] = useState(gravidade ?? 3);
  const [u, setU] = useState(urgencia ?? 3);
  const [t, setT] = useState(tendencia ?? 3);

  const hasExisting = gravidade != null && urgencia != null && tendencia != null;

  useEffect(() => {
    if (hasExisting) {
      setG(gravidade!);
      setU(urgencia!);
      setT(tendencia!);
    }
  }, [gravidade, urgencia, tendencia, hasExisting]);

  const computedScore = g * u * t;

  useEffect(() => {
    if (editable && onChange) {
      onChange({ gut_gravidade: g, gut_urgencia: u, gut_tendencia: t });
    }
  }, [g, u, t, editable]);

  const displayScore = editable ? computedScore : (score ?? computedScore);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          📊 Matriz GUT — Priorização
        </h4>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-sm px-3 py-1", getScoreColor(displayScore))}>
            Score: {displayScore}
          </Badge>
          <Badge variant="outline" className="text-xs">
            → {getScoreLabel(displayScore)}
          </Badge>
        </div>
      </div>

      <ScaleSelector
        label="Gravidade — Quais os efeitos?"
        icon="🔴"
        items={GRAVIDADE_LABELS}
        value={g}
        onChange={setG}
        editable={editable}
        color="bg-red-500 text-white"
      />
      <ScaleSelector
        label="Urgência — Pode esperar?"
        icon="🟡"
        items={URGENCIA_LABELS}
        value={u}
        onChange={setU}
        editable={editable}
        color="bg-amber-500 text-white"
      />
      <ScaleSelector
        label="Tendência — Probabilidade de piorar?"
        icon="🔵"
        items={TENDENCIA_LABELS}
        value={t}
        onChange={setT}
        editable={editable}
        color="bg-blue-500 text-white"
      />

      <div className="text-[11px] text-muted-foreground text-center pt-1">
        Score = G × U × T = {g} × {u} × {t} = <strong>{displayScore}</strong>
        {" "}| Baixa (1-7) · Média (8-26) · Alta (27-63) · Urgente (64-125)
      </div>
    </div>
  );
}
