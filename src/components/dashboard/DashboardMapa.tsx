import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { brazilStates, BRAZIL_VIEWBOX } from "./BrazilMapPaths";

const gestorColors = [
  "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#a855f7", "#84cc16", "#e11d48", "#0ea5e9", "#d946ef",
];

const ROLE_OPTIONS = [
  { value: "gestor_nacional", label: "Gestor Nacional" },
  { value: "gestor_regional", label: "Gestor Regional" },
  { value: "fiscal_contrato", label: "Fiscal de Contrato" },
  { value: "operador", label: "Operador" },
  { value: "preposto", label: "Preposto" },
  { value: "terceirizado", label: "Terceirizado" },
] as const;

type UserByUF = {
  uf: string;
  user_name: string;
  regional_sigla: string;
};

function useUsersByRoleAndUF(role: string) {
  return useQuery({
    queryKey: ["users-by-role-uf", role],
    queryFn: async () => {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", role as any);
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

      const result: UserByUF[] = [];
      for (const ur of (userRegionais || []) as any[]) {
        const regional = regionalMap.get(ur.regional_id);
        const name = nameMap.get(ur.user_id);
        if (regional && name) {
          result.push({
            uf: regional.uf,
            user_name: name.split(" ")[0],
            regional_sigla: regional.sigla,
          });
        }
      }

      return result;
    },
  });
}

// Small states: font size smaller
const SMALL_STATES = new Set(["DF", "RJ", "ES", "SE", "AL", "RN", "PB"]);

export default function DashboardMapa() {
  const [selectedRole, setSelectedRole] = useState("gestor_nacional");
  const { data: users = [], isLoading } = useUsersByRoleAndUF(selectedRole);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const roleLabel = ROLE_OPTIONS.find(r => r.value === selectedRole)?.label || selectedRole;

  // Group by UF
  const usersByUF: Record<string, UserByUF[]> = {};
  for (const u of users) {
    if (!usersByUF[u.uf]) usersByUF[u.uf] = [];
    usersByUF[u.uf].push(u);
  }

  // Assign colors by unique name
  const uniqueNames = [...new Set(users.map((u) => u.user_name))];
  const nameColorMap = new Map(uniqueNames.map((n, i) => [n, gestorColors[i % gestorColors.length]]));

  const hoveredInfo = hoveredState ? usersByUF[hoveredState] : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg">Mapa por Perfil e UF</CardTitle>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* SVG Map */}
              <div className="flex-1 min-w-0">
                <svg viewBox={BRAZIL_VIEWBOX} className="w-full h-auto max-h-[600px]">
                  <defs>
                    <filter id="stateShadow" x="-2%" y="-2%" width="104%" height="104%">
                      <feDropShadow dx="0.5" dy="0.8" stdDeviation="0.8" floodColor="#000" floodOpacity="0.10" />
                    </filter>
                  </defs>
                  {brazilStates.map((state) => {
                    const ufUsers = usersByUF[state.uf] || [];
                    const primaryColor = ufUsers.length > 0
                      ? nameColorMap.get(ufUsers[0].user_name) || "#94a3b8"
                      : "hsl(var(--muted))";
                    const isHovered = hoveredState === state.uf;
                    const isSmall = SMALL_STATES.has(state.uf);

                    return (
                      <g
                        key={state.uf}
                        onMouseEnter={() => setHoveredState(state.uf)}
                        onMouseLeave={() => setHoveredState(null)}
                        className="cursor-pointer"
                        filter="url(#stateShadow)"
                      >
                        {state.paths.map((d, i) => (
                          <path
                            key={i}
                            d={d}
                            fill={ufUsers.length > 0 ? primaryColor : "hsl(var(--muted))"}
                            fillOpacity={isHovered ? 1 : 0.85}
                            stroke="hsl(var(--muted-foreground) / 0.35)"
                            strokeWidth={isHovered ? 1.2 : 0.5}
                            strokeLinejoin="round"
                            className="transition-all duration-150"
                          />
                        ))}
                        {isSmall ? (
                          <>
                            <circle
                              cx={state.centroidX}
                              cy={state.centroidY}
                              r="10"
                              fill="hsl(var(--background))"
                              stroke="hsl(var(--muted-foreground) / 0.5)"
                              strokeWidth="0.8"
                              style={{ pointerEvents: "none" }}
                            />
                            <text
                              x={state.centroidX}
                              y={state.centroidY}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="9"
                              fontWeight="bold"
                              fill="hsl(var(--foreground))"
                              className="select-none"
                              style={{ pointerEvents: "none" }}
                            >
                              {state.uf}
                            </text>
                          </>
                        ) : (
                          <text
                            x={state.centroidX}
                            y={state.centroidY}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="11"
                            fontWeight="bold"
                            fill="hsl(var(--foreground))"
                            className="select-none"
                            style={{ pointerEvents: "none" }}
                          >
                            {state.uf}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend + details */}
              <div className="lg:w-72 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Legenda — {roleLabel}
                  </h3>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {uniqueNames.map((name) => {
                      const ufs = users.filter(u => u.user_name === name).map(u => u.uf);
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
                      <p className="text-xs text-muted-foreground">Nenhum {roleLabel.toLowerCase()} encontrado</p>
                    )}
                  </div>
                </div>

                {hoveredInfo && hoveredState && (
                  <Card className="border-primary/50 bg-primary/10 shadow-md shadow-primary/10">
                    <CardContent className="p-3">
                      <p className="text-sm font-bold mb-1.5 text-primary">{hoveredState}</p>
                      {hoveredInfo.map((u, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{u.user_name}</span>
                          {" — "}
                          {u.regional_sigla}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">UFs sem {roleLabel.toLowerCase()}</h3>
                  <div className="flex flex-wrap gap-1">
                    {brazilStates
                      .filter((s) => !usersByUF[s.uf]?.length)
                      .map((s) => s.uf)
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
