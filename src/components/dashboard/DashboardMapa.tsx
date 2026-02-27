import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

// Brazil state SVG paths (simplified)
const statePaths: Record<string, { d: string; labelX: number; labelY: number }> = {
  AC: { d: "M100,340 L130,320 L140,340 L130,370 L100,370 Z", labelX: 115, labelY: 348 },
  AL: { d: "M590,310 L610,300 L620,315 L605,325 Z", labelX: 603, labelY: 315 },
  AM: { d: "M140,200 L280,180 L300,220 L280,280 L200,300 L130,290 L100,250 L110,210 Z", labelX: 195, labelY: 245 },
  AP: { d: "M350,140 L380,120 L400,140 L390,175 L360,180 Z", labelX: 373, labelY: 152 },
  BA: { d: "M490,310 L560,290 L590,310 L580,380 L530,400 L480,380 L470,340 Z", labelX: 528, labelY: 345 },
  CE: { d: "M540,220 L580,210 L595,240 L570,265 L540,260 Z", labelX: 565, labelY: 240 },
  DF: { d: "M440,370 L455,365 L458,378 L443,382 Z", labelX: 449, labelY: 375 },
  ES: { d: "M550,400 L575,390 L580,415 L560,425 Z", labelX: 563, labelY: 408 },
  GO: { d: "M400,350 L460,340 L470,380 L450,410 L400,400 Z", labelX: 432, labelY: 375 },
  MA: { d: "M420,200 L480,190 L500,220 L480,260 L440,260 L420,230 Z", labelX: 458, labelY: 228 },
  MG: { d: "M450,380 L530,370 L560,400 L540,440 L480,450 L440,430 Z", labelX: 498, labelY: 410 },
  MS: { d: "M330,410 L390,400 L400,440 L370,480 L330,470 Z", labelX: 362, labelY: 440 },
  MT: { d: "M270,290 L370,280 L400,340 L380,390 L300,400 L260,360 Z", labelX: 328, labelY: 340 },
  PA: { d: "M280,170 L370,155 L400,180 L420,220 L400,260 L340,270 L280,260 L250,220 Z", labelX: 340, labelY: 215 },
  PB: { d: "M570,265 L610,258 L618,272 L580,280 Z", labelX: 592, labelY: 270 },
  PE: { d: "M555,278 L610,270 L618,290 L590,300 L560,300 Z", labelX: 585, labelY: 288 },
  PI: { d: "M480,230 L520,220 L540,260 L520,300 L480,300 L470,260 Z", labelX: 505, labelY: 265 },
  PR: { d: "M370,470 L430,460 L450,480 L420,510 L370,510 Z", labelX: 408, labelY: 488 },
  RJ: { d: "M510,440 L550,430 L560,450 L530,460 Z", labelX: 535, labelY: 445 },
  RN: { d: "M575,245 L610,238 L618,255 L585,260 Z", labelX: 595, labelY: 250 },
  RO: { d: "M200,310 L260,300 L270,340 L240,370 L200,360 Z", labelX: 233, labelY: 335 },
  RR: { d: "M190,120 L230,100 L260,130 L240,170 L200,170 Z", labelX: 223, labelY: 140 },
  RS: { d: "M350,520 L410,510 L420,550 L390,580 L350,570 Z", labelX: 383, labelY: 545 },
  SC: { d: "M390,500 L440,495 L445,520 L400,525 Z", labelX: 417, labelY: 510 },
  SE: { d: "M575,305 L595,298 L598,315 L580,318 Z", labelX: 586, labelY: 308 },
  SP: { d: "M400,440 L470,430 L490,460 L460,490 L400,480 Z", labelX: 443, labelY: 460 },
  TO: { d: "M420,260 L470,250 L480,300 L460,340 L420,330 Z", labelX: 448, labelY: 295 },
};

// Color palette for gestores
const gestorColors = [
  "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
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
      // Get all gestor_nacional user IDs
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "gestor_nacional" as any);
      if (rErr) throw rErr;
      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      // Get user_regionais for these users
      const { data: userRegionais, error: urErr } = await supabase
        .from("user_regionais" as any)
        .select("user_id, regional_id")
        .in("user_id", userIds);
      if (urErr) throw urErr;

      // Get all regionais
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
            gestor_name: name.split(" ")[0], // First name only
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

  // Get hovered state info
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
              <svg viewBox="60 80 600 520" className="w-full h-auto max-h-[600px]">
                {Object.entries(statePaths).map(([uf, { d, labelX, labelY }]) => {
                  const ufGestores = gestoresByUF[uf] || [];
                  const primaryColor = ufGestores.length > 0
                    ? nameColorMap.get(ufGestores[0].gestor_name) || "#94a3b8"
                    : "#e2e8f0";
                  const isHovered = hoveredState === uf;

                  return (
                    <g
                      key={uf}
                      onMouseEnter={() => setHoveredState(uf)}
                      onMouseLeave={() => setHoveredState(null)}
                      className="cursor-pointer"
                    >
                      <path
                        d={d}
                        fill={primaryColor}
                        fillOpacity={isHovered ? 0.9 : 0.6}
                        stroke="hsl(var(--foreground))"
                        strokeWidth={isHovered ? 1.5 : 0.8}
                        strokeOpacity={0.5}
                        className="transition-all duration-150"
                      />
                      <text
                        x={labelX}
                        y={labelY - 6}
                        textAnchor="middle"
                        className="fill-foreground font-bold"
                        fontSize="11"
                        style={{ pointerEvents: "none" }}
                      >
                        {uf}
                      </text>
                      {ufGestores.length > 0 && (
                        <text
                          x={labelX}
                          y={labelY + 8}
                          textAnchor="middle"
                          fontSize="8"
                          className="fill-foreground"
                          fontWeight="500"
                          style={{ pointerEvents: "none" }}
                        >
                          {ufGestores.map((g) => g.gestor_name).join(", ")}
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
                <h3 className="text-sm font-semibold text-foreground mb-2">Legenda — Gestores</h3>
                <div className="space-y-1.5">
                  {uniqueNames.map((name) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: nameColorMap.get(name) }}
                      />
                      <span className="text-foreground">{name}</span>
                    </div>
                  ))}
                  {uniqueNames.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum gestor nacional encontrado</p>
                  )}
                </div>
              </div>

              {hoveredInfo && (
                <Card className="border-primary/30">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold mb-1">{hoveredState}</p>
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
