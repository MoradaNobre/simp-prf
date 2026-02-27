import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { statePaths, BRAZIL_VIEWBOX } from "./BrazilMapPaths";

// Color palette for gestores
const gestorColors = [
  "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#a855f7", "#84cc16", "#e11d48", "#0ea5e9", "#d946ef",
];

type GestorRegionalData = {
  uf: string;
  gestor_name: string;
  regional_sigla: string;
};

function useGestoresNacionaisPorUF() {
  return useQuery({
    queryKey: ["gestores-nacionais-por-uf"],
    queryFn: async () => {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "gestor_nacional" as any);
      if (rErr) throw rErr;
      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      const { data: userRegionais, error: urErr } = await supabase
        .from("user_regionais" as any)
        .select("user_id, regional_id")
        .in("user_id", userIds);
      if (urErr) throw urErr;

      const { data: regionais, error: regErr } = await supabase
        .from("regionais")
        .select("id, sigla, uf");
      if (regErr) throw regErr;

      const regionalMap = new Map((regionais || []).map((r) => [r.id, r]));

      const result: GestorRegionalData[] = [];
      for (const ur of (userRegionais || []) as any[]) {
        const regional = regionalMap.get(ur.regional_id);
        const name = nameMap.get(ur.user_id);
        if (regional && name) {
          result.push({
            uf: regional.uf,
            gestor_name: name.split(" ")[0],
            regional_sigla: regional.sigla,
          });
        }
      }

      return result;
    },
  });
}

export default function DashboardMapa() {
  const { data: gestores = [], isLoading } = useGestoresNacionaisPorUF();
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by UF
  const gestoresByUF: Record<string, GestorRegionalData[]> = {};
  for (const g of gestores) {
    if (!gestoresByUF[g.uf]) gestoresByUF[g.uf] = [];
    gestoresByUF[g.uf].push(g);
  }

  // Assign colors by unique gestor name
  const uniqueNames = [...new Set(gestores.map((g) => g.gestor_name))];
  const nameColorMap = new Map(uniqueNames.map((n, i) => [n, gestorColors[i % gestorColors.length]]));

  const hoveredInfo = hoveredState ? gestoresByUF[hoveredState] : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mapa de Gestores Nacionais por UF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* SVG Map */}
            <div className="flex-1 min-w-0">
              <svg viewBox={BRAZIL_VIEWBOX} className="w-full h-auto max-h-[600px]">
                {/* State shapes */}
                {Object.entries(statePaths).map(([uf, state]) => {
                  const ufGestores = gestoresByUF[uf] || [];
                  const primaryColor = ufGestores.length > 0
                    ? nameColorMap.get(ufGestores[0].gestor_name) || "#94a3b8"
                    : "hsl(var(--muted))";
                  const isHovered = hoveredState === uf;

                  return (
                    <g
                      key={uf}
                      onMouseEnter={() => setHoveredState(uf)}
                      onMouseLeave={() => setHoveredState(null)}
                      className="cursor-pointer"
                    >
                      <path
                        d={state.d}
                        fill={ufGestores.length > 0 ? primaryColor : "hsl(var(--muted))"}
                        fillOpacity={isHovered ? 0.95 : 0.7}
                        stroke="hsl(var(--background))"
                        strokeWidth={isHovered ? 1.8 : 1}
                        className="transition-all duration-150"
                      />
                      {/* Only render label on the state if it has no circle callout */}
                      {!state.circlePath && (
                        <text
                          x={state.labelX}
                          y={state.labelY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-background font-bold select-none"
                          fontSize="10"
                          style={{ pointerEvents: "none" }}
                        >
                          {uf}
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* Circle callouts for small states — rendered on top */}
                {Object.entries(statePaths)
                  .filter(([, state]) => state.circlePath)
                  .map(([uf, state]) => {
                    const ufGestores = gestoresByUF[uf] || [];
                    const primaryColor = ufGestores.length > 0
                      ? nameColorMap.get(ufGestores[0].gestor_name) || "#94a3b8"
                      : "hsl(var(--muted))";
                    const isHovered = hoveredState === uf;
                    return (
                      <g
                        key={`circle-${uf}`}
                        onMouseEnter={() => setHoveredState(uf)}
                        onMouseLeave={() => setHoveredState(null)}
                        className="cursor-pointer"
                      >
                        <path
                          d={state.circlePath!}
                          fill={ufGestores.length > 0 ? primaryColor : "hsl(var(--muted))"}
                          fillOpacity={isHovered ? 1 : 0.9}
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                        />
                        <text
                          x={state.labelX}
                          y={state.labelY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-background font-bold select-none"
                          fontSize="8"
                          style={{ pointerEvents: "none" }}
                        >
                          {uf}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>

            {/* Legend + details */}
            <div className="lg:w-72 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Legenda — Gestores</h3>
                <div className="space-y-1.5">
                  {uniqueNames.map((name) => {
                    const ufs = gestores.filter(g => g.gestor_name === name).map(g => g.uf);
                    return (
                      <div key={name} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: nameColorMap.get(name) }}
                        />
                        <span className="text-foreground font-medium">{name}</span>
                        <span className="text-muted-foreground text-xs">({ufs.join(", ")})</span>
                      </div>
                    );
                  })}
                  {uniqueNames.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum gestor nacional encontrado</p>
                  )}
                </div>
              </div>

              {hoveredInfo && hoveredState && (
                <Card className="border-primary/50 bg-primary/10 shadow-md shadow-primary/10">
                  <CardContent className="p-3">
                    <p className="text-sm font-bold mb-1.5 text-primary">{hoveredState}</p>
                    {hoveredInfo.map((g, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{g.gestor_name}</span>
                        {" — "}
                        {g.regional_sigla}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">UFs sem gestor</h3>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(statePaths)
                    .filter((uf) => !gestoresByUF[uf]?.length)
                    .sort()
                    .map((uf) => (
                      <span key={uf} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {uf}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
