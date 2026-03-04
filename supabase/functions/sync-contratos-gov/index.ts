import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://contratos.comprasnet.gov.br";

// PRF UASGs typically start with 194
const PRF_PREFIX = "194";

// Terms to filter for "manutenção predial"
const FILTER_TERMS = [
  "manutencao predial",
  "manutenção predial",
  "reparos prediais",
  "conservacao predial",
  "conservação predial",
];

// ─── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (res.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Rate limited] Retry in ${delay}ms: ${url}`);
        await sleep(delay);
        continue;
      }

      if (!res.ok && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[HTTP ${res.status}] Retry in ${delay}ms: ${url}`);
        await sleep(delay);
        continue;
      }

      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Error] Retry in ${delay}ms: ${url}`, err);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries: ${url}`);
}

function parseDecimal(val: any): number {
  if (val === null || val === undefined || val === "null") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function matchesFilter(objeto: string | null | undefined): boolean {
  if (!objeto) return false;
  const lower = objeto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return FILTER_TERMS.some((term) => {
    const normTerm = term
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return lower.includes(normTerm);
  });
}

// ─── Main Sync Logic ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Create sync log entry
  const { data: syncLog, error: logErr } = await supabase
    .from("contratos_gov_sync_log")
    .insert({ status: "em_andamento" })
    .select("id")
    .single();

  if (logErr) {
    console.error("Failed to create sync log:", logErr);
    return new Response(
      JSON.stringify({ success: false, error: "Falha ao criar log de sincronização" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const syncId = syncLog.id;
  let totalUasgs = 0;
  let totalContratos = 0;
  let totalImportados = 0;
  let totalErros = 0;
  const errors: string[] = [];

  try {
    // Step 1: Get all units with active contracts
    console.log("[sync] Fetching unidades...");
    const unidadesRes = await fetchWithRetry(`${API_BASE}/api/contrato/unidades`);
    const unidades = await unidadesRes.json();

    // Filter PRF UASGs (codes starting with 194)
    const prfUnidades: any[] = [];
    if (Array.isArray(unidades)) {
      for (const u of unidades) {
        const codigo = String(u.codigo || u.unidade_codigo || "");
        if (codigo.startsWith(PRF_PREFIX)) {
          prfUnidades.push(codigo);
        }
      }
    }

    totalUasgs = prfUnidades.length;
    console.log(`[sync] Found ${totalUasgs} PRF UASGs`);

    // Step 2: For each UASG, fetch contracts and filter
    for (const uasgCodigo of prfUnidades) {
      try {
        console.log(`[sync] Fetching contracts for UASG ${uasgCodigo}...`);
        const contractsRes = await fetchWithRetry(
          `${API_BASE}/api/contrato/ug/${uasgCodigo}`
        );
        const contracts = await contractsRes.json();

        if (!Array.isArray(contracts)) {
          console.warn(`[sync] UASG ${uasgCodigo}: response is not array`);
          continue;
        }

        totalContratos += contracts.length;

        // Filter for "manutenção predial"
        const filtered = contracts.filter((c: any) => matchesFilter(c.objeto));
        console.log(
          `[sync] UASG ${uasgCodigo}: ${contracts.length} total, ${filtered.length} manutenção predial`
        );

        for (const contrato of filtered) {
          try {
            const govId = contrato.id;

            // Step 3: Fetch empenhos
            let empenhos: any[] = [];
            try {
              const empRes = await fetchWithRetry(
                `${API_BASE}/api/contrato/${govId}/empenhos`
              );
              const empData = await empRes.json();
              empenhos = Array.isArray(empData) ? empData : [];
            } catch (e) {
              console.warn(`[sync] Empenhos error for ${govId}:`, e);
            }

            // Step 4: Fetch historico (aditivos)
            let historico: any[] = [];
            try {
              const histRes = await fetchWithRetry(
                `${API_BASE}/api/contrato/${govId}/historico`
              );
              const histData = await histRes.json();
              historico = Array.isArray(histData) ? histData : [];
            } catch (e) {
              console.warn(`[sync] Historico error for ${govId}:`, e);
            }

            // Upsert into contratos_gov_import
            const record = {
              contrato_gov_id: govId,
              uasg_codigo: String(uasgCodigo),
              numero: contrato.numero || "",
              empresa: contrato.fornecedor?.nome || "N/I",
              cnpj: contrato.fornecedor?.cnpj_cpf_idgener || null,
              objeto: contrato.objeto || null,
              vigencia_inicio: contrato.vigencia_inicio || null,
              vigencia_fim: contrato.vigencia_fim || null,
              valor_global: parseDecimal(contrato.valor_global),
              valor_inicial: parseDecimal(contrato.valor_inicial),
              valor_acumulado: parseDecimal(contrato.valor_acumulado),
              situacao: contrato.situacao || null,
              categoria: contrato.categoria || null,
              modalidade: contrato.modalidade || null,
              processo: contrato.processo || null,
              data_assinatura: contrato.data_assinatura || null,
              empenhos: empenhos,
              historico: historico,
              atualizado_em: new Date().toISOString(),
            };

            const { error: upsertErr } = await supabase
              .from("contratos_gov_import")
              .upsert(record, { onConflict: "contrato_gov_id" });

            if (upsertErr) {
              console.error(`[sync] Upsert error for ${govId}:`, upsertErr);
              totalErros++;
              errors.push(`Contrato ${govId}: ${upsertErr.message}`);
            } else {
              totalImportados++;
            }

            // Small delay between contracts to avoid rate limiting
            await sleep(200);
          } catch (contractErr: any) {
            totalErros++;
            errors.push(
              `Contrato ${contrato.id}: ${contractErr?.message || "Erro desconhecido"}`
            );
          }
        }

        // Delay between UASGs
        await sleep(500);
      } catch (uasgErr: any) {
        totalErros++;
        errors.push(
          `UASG ${uasgCodigo}: ${uasgErr?.message || "Erro desconhecido"}`
        );
      }
    }

    // Update sync log with results
    await supabase
      .from("contratos_gov_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        status: totalErros > 0 ? "concluido_com_erros" : "concluido",
        total_uasgs: totalUasgs,
        total_contratos: totalContratos,
        total_importados: totalImportados,
        total_erros: totalErros,
        detalhes: { errors: errors.slice(0, 50) },
      })
      .eq("id", syncId);

    console.log(
      `[sync] Done! UASGs: ${totalUasgs}, Contracts scanned: ${totalContratos}, Imported: ${totalImportados}, Errors: ${totalErros}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        sync_id: syncId,
        total_uasgs: totalUasgs,
        total_contratos: totalContratos,
        total_importados: totalImportados,
        total_erros: totalErros,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[sync] Fatal error:", err);

    await supabase
      .from("contratos_gov_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        status: "erro",
        total_uasgs: totalUasgs,
        total_contratos: totalContratos,
        total_importados: totalImportados,
        total_erros: totalErros + 1,
        detalhes: { fatal_error: err?.message, errors: errors.slice(0, 50) },
      })
      .eq("id", syncId);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro durante a sincronização",
        sync_id: syncId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
