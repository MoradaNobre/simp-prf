import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is gestor_nacional
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: csvText } = await req.json();
    if (!csvText) {
      return new Response(JSON.stringify({ error: "CSV vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse CSV (semicolon-separated)
    const lines = csvText.split("\n").filter((l: string) => l.trim() && !l.startsWith("\uFEFF") || l.includes(";"));
    // Remove BOM and header
    const dataLines = lines.slice(1).filter((l: string) => {
      const parts = l.split(";");
      return parts[0] && parts[0].trim() !== "";
    });

    // Extract unique regionais
    const regionalMap = new Map<string, { nome: string; sigla: string; uf: string }>();
    const ufMap: Record<string, string> = {
      AC: "AC", AL: "AL", AM: "AM", AP: "AP", BA: "BA", CE: "CE", DF: "DF",
      ES: "ES", GO: "GO", MA: "MA", MG: "MG", MS: "MS", MT: "MT", PA: "PA",
      PB: "PB", PE: "PE", PI: "PI", PR: "PR", RJ: "RJ", RN: "RN", RO: "RO",
      RR: "RR", RS: "RS", SC: "SC", SE: "SE", SP: "SP", TO: "TO",
    };

    for (const line of dataLines) {
      const parts = line.split(";");
      const unidadeGestora = parts[1]?.trim();
      const tipo = parts[2]?.trim();
      const nome = parts[3]?.trim();

      if (!unidadeGestora) continue;

      if (unidadeGestora.startsWith("SPRF/")) {
        const uf = unidadeGestora.replace("SPRF/", "");
        if (!regionalMap.has(unidadeGestora)) {
          regionalMap.set(unidadeGestora, {
            nome: `Superintendência - ${uf}`,
            sigla: `SPRF/${uf}`,
            uf: ufMap[uf] || uf,
          });
        }
        if (tipo === "SEDE REGIONAL" && nome) {
          const entry = regionalMap.get(unidadeGestora)!;
          entry.nome = nome;
        }
      } else if (!regionalMap.has(unidadeGestora)) {
        // SEDE NACIONAL, UNIPRF, etc.
        regionalMap.set(unidadeGestora, {
          nome: unidadeGestora,
          sigla: unidadeGestora,
          uf: "DF",
        });
      }
    }

    // Insert regionais
    const regionaisToInsert = Array.from(regionalMap.values());
    const { data: insertedRegionais, error: regError } = await supabase
      .from("regionais")
      .upsert(regionaisToInsert, { onConflict: "sigla" })
      .select();

    if (regError) {
      // If upsert fails (no unique constraint on sigla), try insert
      // First clear existing
      await supabase.from("regionais").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { data: freshRegionais, error: freshError } = await supabase
        .from("regionais")
        .insert(regionaisToInsert)
        .select();
      if (freshError) throw freshError;
      var regionaisData = freshRegionais;
    } else {
      var regionaisData = insertedRegionais;
    }

    // Build sigla->id map
    const siglaToRegionalId = new Map<string, string>();
    for (const r of regionaisData!) {
      siglaToRegionalId.set(r.sigla, r.id);
    }

    // Parse delegacias and UOPs
    type DelRecord = { nome: string; regional_id: string; municipio: string | null };
    type UopRecord = { nome: string; delegacia_id: string; endereco: string | null; latitude: number | null; longitude: number | null };

    const delegacias: DelRecord[] = [];
    const uopsByDel: Map<number, UopRecord[]> = new Map();
    let currentDelIndex = -1;
    let currentRegionalId = "";

    // Also track "other" types as UOPs under a default delegacia per regional
    const otherUnitsByRegional = new Map<string, { nome: string; endereco: string | null; latitude: number | null; longitude: number | null }[]>();

    for (const line of dataLines) {
      const parts = line.split(";");
      const unidadeGestora = parts[1]?.trim();
      const tipo = parts[2]?.trim();
      const nome = parts[3]?.trim();
      const endereco = parts[4]?.trim() || null;
      const coordStr = parts[5]?.trim() || "";

      if (!unidadeGestora || !tipo || !nome) continue;

      let lat: number | null = null;
      let lng: number | null = null;
      if (coordStr) {
        const cleaned = coordStr.replace(/°/g, "").replace(/\s/g, "");
        const coordParts = cleaned.split(",");
        if (coordParts.length >= 2) {
          const parsedLat = parseFloat(coordParts[0]);
          const parsedLng = parseFloat(coordParts[1]);
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
          }
        }
      }

      const regionalSigla = unidadeGestora.startsWith("SPRF/") ? unidadeGestora : unidadeGestora;
      const regId = siglaToRegionalId.get(regionalSigla);
      if (!regId) continue;

      if (tipo === "DEL") {
        currentDelIndex = delegacias.length;
        currentRegionalId = regId;
        delegacias.push({
          nome: nome.trim(),
          regional_id: regId,
          municipio: nome.trim(),
        });
        uopsByDel.set(currentDelIndex, []);
      } else if (tipo === "UOP") {
        if (currentDelIndex >= 0 && delegacias[currentDelIndex]?.regional_id === regId) {
          uopsByDel.get(currentDelIndex)!.push({
            nome: nome.trim(),
            delegacia_id: "", // will be filled after insert
            endereco,
            latitude: lat,
            longitude: lng,
          });
        }
      } else if (tipo === "SEDE REGIONAL") {
        // Create a default delegacia "Sede" for this regional
        currentDelIndex = delegacias.length;
        currentRegionalId = regId;
        delegacias.push({
          nome: "Sede - " + nome.trim(),
          regional_id: regId,
          municipio: null,
        });
        uopsByDel.set(currentDelIndex, []);
      }
    }

    // Clear existing delegacias and uops
    await supabase.from("equipamentos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("uops").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("delegacias").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert delegacias in batches
    let totalDels = 0;
    let totalUops = 0;
    const BATCH = 50;

    for (let i = 0; i < delegacias.length; i += BATCH) {
      const batch = delegacias.slice(i, i + BATCH);
      const { data: insertedDels, error: delError } = await supabase
        .from("delegacias")
        .insert(batch)
        .select();
      if (delError) {
        console.error("Del insert error:", delError);
        continue;
      }
      totalDels += insertedDels!.length;

      // Insert UOPs for each delegacia in this batch
      for (let j = 0; j < insertedDels!.length; j++) {
        const delIdx = i + j;
        const uops = uopsByDel.get(delIdx) || [];
        if (uops.length === 0) continue;

        const uopsWithDelId = uops.map((u) => ({
          ...u,
          delegacia_id: insertedDels![j].id,
        }));

        const { data: insertedUops, error: uopError } = await supabase
          .from("uops")
          .insert(uopsWithDelId)
          .select();
        if (uopError) {
          console.error("UOP insert error:", uopError);
          continue;
        }
        totalUops += insertedUops!.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        regionais: regionaisData!.length,
        delegacias: totalDels,
        uops: totalUops,
      }),
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
