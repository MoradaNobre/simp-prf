import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Parse CSV handling quoted fields with newlines/semicolons */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ';') {
        current.push(field.trim());
        field = "";
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field.trim());
        field = "";
        if (current.some(c => c !== "")) rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }
  // last field/row
  current.push(field.trim());
  if (current.some(c => c !== "")) rows.push(current);
  return rows;
}

function parseCoords(coordStr: string): { lat: number | null; lng: number | null } {
  if (!coordStr) return { lat: null, lng: null };
  const cleaned = coordStr.replace(/°/g, "").replace(/\s/g, "");
  // Try splitting by comma - but coords are "lat,lng" or "lat, lng"  
  const parts = cleaned.split(",");
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  return { lat: null, lng: null };
}

const VALID_UG_PREFIXES = ["SPRF/", "SEDE NACIONAL", "UNIPRF"];

function isValidUnidadeGestora(ug: string): boolean {
  return VALID_UG_PREFIXES.some(p => ug.startsWith(p));
}

const ufMap: Record<string, string> = {
  AC: "AC", AL: "AL", AM: "AM", AP: "AP", BA: "BA", CE: "CE", DF: "DF",
  ES: "ES", GO: "GO", MA: "MA", MG: "MG", MS: "MS", MT: "MT", PA: "PA",
  PB: "PB", PE: "PE", PI: "PI", PR: "PR", RJ: "RJ", RN: "RN", RO: "RO",
  RR: "RR", RS: "RS", SC: "SC", SE: "SE", SP: "SP", TO: "TO",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: csvText } = await req.json();
    if (!csvText) {
      return new Response(JSON.stringify({ error: "CSV vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove BOM
    const cleanText = csvText.replace(/^\uFEFF/, "");
    const allRows = parseCSV(cleanText);
    
    // Skip header row
    const dataRows = allRows.slice(1).filter(row => row.length >= 4 && row[0].trim() !== "");

    // ---- Extract regionais ----
    const regionalMap = new Map<string, { nome: string; sigla: string; uf: string }>();

    for (const row of dataRows) {
      const ug = row[1]?.trim();
      const tipo = row[2]?.trim();
      const nome = row[3]?.trim();
      if (!ug || !isValidUnidadeGestora(ug)) continue;

      if (ug.startsWith("SPRF/")) {
        const ufCode = ug.replace("SPRF/", "");
        if (!regionalMap.has(ug)) {
          regionalMap.set(ug, {
            nome: `Superintendência - ${ufCode}`,
            sigla: ug,
            uf: ufMap[ufCode] || ufCode,
          });
        }
        if (tipo === "SEDE REGIONAL" && nome) {
          regionalMap.get(ug)!.nome = nome;
        }
      } else if (!regionalMap.has(ug)) {
        regionalMap.set(ug, { nome: ug, sigla: ug, uf: "DF" });
      }
    }

    // ---- Clear & insert regionais ----
    await supabase.from("equipamentos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("uops").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("delegacias").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("regionais").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const regionaisToInsert = Array.from(regionalMap.values());
    const { data: regionaisData, error: regError } = await supabase
      .from("regionais").insert(regionaisToInsert).select();
    if (regError) throw regError;

    const siglaToId = new Map<string, string>();
    for (const r of regionaisData!) siglaToId.set(r.sigla, r.id);

    // ---- Parse delegacias & UOPs ----
    type DelRec = { nome: string; regional_id: string; municipio: string | null };
    type UopRec = { nome: string; delegacia_id: string; endereco: string | null; latitude: number | null; longitude: number | null };

    const delegacias: DelRec[] = [];
    const uopsByDel = new Map<number, UopRec[]>();
    let currentDelIdx = -1;
    let currentRegId = "";

    for (const row of dataRows) {
      const ug = row[1]?.trim();
      const tipo = row[2]?.trim();
      const nome = row[3]?.trim();
      const endereco = row[4]?.trim() || null;
      const coordStr = row[5]?.trim() || "";

      if (!ug || !tipo || !nome || !isValidUnidadeGestora(ug)) continue;

      const regId = siglaToId.get(ug);
      if (!regId) continue;

      const { lat, lng } = parseCoords(coordStr);

      if (tipo === "DEL") {
        currentDelIdx = delegacias.length;
        currentRegId = regId;
        delegacias.push({ nome: nome, regional_id: regId, municipio: nome });
        uopsByDel.set(currentDelIdx, []);
      } else if (tipo === "UOP") {
        if (currentDelIdx >= 0 && delegacias[currentDelIdx]?.regional_id === regId) {
          uopsByDel.get(currentDelIdx)!.push({
            nome, delegacia_id: "", endereco, latitude: lat, longitude: lng,
          });
        }
      } else if (tipo === "SEDE REGIONAL") {
        currentDelIdx = delegacias.length;
        currentRegId = regId;
        delegacias.push({ nome: "Sede - " + nome, regional_id: regId, municipio: null });
        uopsByDel.set(currentDelIdx, []);
      }
      // Other types (HANGAR, CANIL, OUTRO, etc.) are ignored for hierarchy
    }

    // ---- Insert delegacias & UOPs in batches ----
    let totalDels = 0, totalUops = 0;
    const BATCH = 50;

    for (let i = 0; i < delegacias.length; i += BATCH) {
      const batch = delegacias.slice(i, i + BATCH);
      const { data: ins, error: dErr } = await supabase.from("delegacias").insert(batch).select();
      if (dErr) { console.error("Del error:", dErr); continue; }
      totalDels += ins!.length;

      for (let j = 0; j < ins!.length; j++) {
        const uops = uopsByDel.get(i + j) || [];
        if (!uops.length) continue;
        const withId = uops.map(u => ({ ...u, delegacia_id: ins![j].id }));
        const { data: uIns, error: uErr } = await supabase.from("uops").insert(withId).select();
        if (uErr) { console.error("UOP error:", uErr); continue; }
        totalUops += uIns!.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, regionais: regionaisData!.length, delegacias: totalDels, uops: totalUops }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
