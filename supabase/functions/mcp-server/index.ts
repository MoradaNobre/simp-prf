import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabaseClient(authHeader: string | null) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized: missing Bearer token", supabase: null, userId: null };
  }

  const supabase = getSupabaseClient(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    return { error: "Unauthorized: invalid token", supabase: null, userId: null };
  }

  return { error: null, supabase, userId: data.claims.sub as string };
}

// ─── MCP Server ───────────────────────────────────────────────────

const mcpServer = new McpServer({
  name: "simp-prf-mcp",
  version: "1.0.0",
});

// Tool 1: listar_ordens_servico
mcpServer.tool({
  name: "listar_ordens_servico",
  description:
    "Lista ordens de serviço com filtros opcionais. Retorna código, título, status, prioridade, tipo e data de abertura.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Filtrar por status: aberta, orcamento, autorizacao, execucao, ateste, faturamento, pagamento, encerrada",
      },
      prioridade: {
        type: "string",
        description: "Filtrar por prioridade: baixa, media, alta, urgente",
      },
      regional_id: {
        type: "string",
        description: "UUID da regional para filtrar",
      },
      limite: {
        type: "number",
        description: "Número máximo de resultados (padrão 50, máx 200)",
      },
    },
  },
  handler: async (params: any, { request }: any) => {
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return { content: [{ type: "text", text: auth.error }] };
    }

    let query = auth.supabase!
      .from("ordens_servico")
      .select("id, codigo, titulo, status, prioridade, tipo, data_abertura, regional_id, uop_id, contrato_id, valor_orcamento")
      .is("deleted_at", null)
      .order("data_abertura", { ascending: false })
      .limit(Math.min(params.limite || 50, 200));

    if (params.status) query = query.eq("status", params.status);
    if (params.prioridade) query = query.eq("prioridade", params.prioridade);
    if (params.regional_id) query = query.eq("regional_id", params.regional_id);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  },
});

// Tool 2: detalhes_os
mcpServer.tool({
  name: "detalhes_os",
  description:
    "Retorna dados completos de uma Ordem de Serviço específica, incluindo custos, agendamentos e chamados vinculados.",
  inputSchema: {
    type: "object",
    properties: {
      os_id: {
        type: "string",
        description: "UUID da Ordem de Serviço",
      },
    },
    required: ["os_id"],
  },
  handler: async (params: any, { request }: any) => {
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return { content: [{ type: "text", text: auth.error }] };
    }

    const { data: os, error } = await auth.supabase!
      .from("ordens_servico")
      .select("*, regionais:regional_id(nome, sigla), uops:uop_id(nome), contratos:contrato_id(numero, empresa)")
      .eq("id", params.os_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };
    }
    if (!os) {
      return { content: [{ type: "text", text: "OS não encontrada" }] };
    }

    // Fetch related data in parallel
    const [custosRes, agendamentosRes, chamadosRes] = await Promise.all([
      auth.supabase!.from("os_custos").select("*").eq("os_id", params.os_id),
      auth.supabase!.from("agendamentos_visita").select("*").eq("os_id", params.os_id).order("data_agendamento", { ascending: false }),
      auth.supabase!.from("chamados").select("id, codigo, tipo_demanda, status, prioridade").eq("os_id", params.os_id).is("deleted_at", null),
    ]);

    const result = {
      ...os,
      custos: custosRes.data || [],
      agendamentos: agendamentosRes.data || [],
      chamados_vinculados: chamadosRes.data || [],
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// Tool 3: listar_chamados
mcpServer.tool({
  name: "listar_chamados",
  description: "Lista chamados com filtros opcionais por status, regional e busca textual.",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Filtrar por status: aberto, analisado, vinculado, cancelado",
      },
      regional_id: {
        type: "string",
        description: "UUID da regional para filtrar",
      },
      busca: {
        type: "string",
        description: "Busca textual no código, descrição ou tipo de demanda",
      },
      limite: {
        type: "number",
        description: "Número máximo de resultados (padrão 50, máx 200)",
      },
    },
  },
  handler: async (params: any, { request }: any) => {
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return { content: [{ type: "text", text: auth.error }] };
    }

    let query = auth.supabase!
      .from("chamados")
      .select("id, codigo, tipo_demanda, descricao, local_servico, prioridade, status, gut_score, created_at, regional_id, os_id")
      .is("deleted_at", null)
      .order("gut_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(params.limite || 50, 200));

    if (params.status) query = query.eq("status", params.status);
    if (params.regional_id) query = query.eq("regional_id", params.regional_id);
    if (params.busca) {
      query = query.or(
        `codigo.ilike.%${params.busca}%,descricao.ilike.%${params.busca}%,tipo_demanda.ilike.%${params.busca}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  },
});

// Tool 4: listar_contratos
mcpServer.tool({
  name: "listar_contratos",
  description: "Lista contratos com saldo, empresa, vigência e status.",
  inputSchema: {
    type: "object",
    properties: {
      regional_id: {
        type: "string",
        description: "UUID da regional para filtrar",
      },
      status: {
        type: "string",
        description: "Filtrar por status: vigente, encerrado, suspenso",
      },
      limite: {
        type: "number",
        description: "Número máximo de resultados (padrão 50, máx 200)",
      },
    },
  },
  handler: async (params: any, { request }: any) => {
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return { content: [{ type: "text", text: auth.error }] };
    }

    let query = auth.supabase!
      .from("contratos")
      .select("id, numero, empresa, objeto, data_inicio, data_fim, valor_total, status, tipo_servico, regional_id, regionais:regional_id(nome, sigla)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.min(params.limite || 50, 200));

    if (params.regional_id) query = query.eq("regional_id", params.regional_id);
    if (params.status) query = query.eq("status", params.status);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }] };
    }

    // Also fetch saldo data
    const { data: saldos } = await auth.supabase!.from("contratos_saldo").select("*");
    const saldoMap = new Map((saldos || []).map((s: any) => [s.id, s]));

    const enriched = (data || []).map((c: any) => ({
      ...c,
      saldo: saldoMap.get(c.id) || null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }],
    };
  },
});

// Tool 5: dashboard_resumo
mcpServer.tool({
  name: "dashboard_resumo",
  description:
    "Retorna indicadores agregados do sistema: contagem de OS por status, chamados abertos, contratos ativos e saldo orçamentário.",
  inputSchema: {
    type: "object",
    properties: {
      regional_id: {
        type: "string",
        description: "UUID da regional para filtrar (opcional, padrão: todas acessíveis)",
      },
    },
  },
  handler: async (params: any, { request }: any) => {
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return { content: [{ type: "text", text: auth.error }] };
    }

    const sb = auth.supabase!;

    // Parallel queries
    let osQuery = sb.from("ordens_servico").select("status").is("deleted_at", null);
    let chamadosQuery = sb.from("chamados").select("status").is("deleted_at", null);
    let contratosQuery = sb.from("contratos").select("status").is("deleted_at", null);
    let orcamentoQuery = sb.from("vw_orcamento_regional_saldo").select("*");

    if (params.regional_id) {
      osQuery = osQuery.eq("regional_id", params.regional_id);
      chamadosQuery = chamadosQuery.eq("regional_id", params.regional_id);
      contratosQuery = contratosQuery.eq("regional_id", params.regional_id);
      orcamentoQuery = orcamentoQuery.eq("regional_id", params.regional_id);
    }

    const [osRes, chamadosRes, contratosRes, orcRes] = await Promise.all([
      osQuery,
      chamadosQuery,
      contratosQuery,
      orcamentoQuery,
    ]);

    // Count OS by status
    const osByStatus: Record<string, number> = {};
    (osRes.data || []).forEach((o: any) => {
      osByStatus[o.status] = (osByStatus[o.status] || 0) + 1;
    });

    // Count chamados by status
    const chamadosByStatus: Record<string, number> = {};
    (chamadosRes.data || []).forEach((c: any) => {
      chamadosByStatus[c.status] = (chamadosByStatus[c.status] || 0) + 1;
    });

    // Count contratos by status
    const contratosByStatus: Record<string, number> = {};
    (contratosRes.data || []).forEach((c: any) => {
      contratosByStatus[c.status] = (contratosByStatus[c.status] || 0) + 1;
    });

    // Orcamento summary
    const orcamento = {
      total_dotacao: (orcRes.data || []).reduce((s: number, o: any) => s + (o.valor_dotacao || 0), 0),
      total_creditos: (orcRes.data || []).reduce((s: number, o: any) => s + (o.total_creditos || 0), 0),
      total_empenhos: (orcRes.data || []).reduce((s: number, o: any) => s + (o.total_empenhos || 0), 0),
      saldo_disponivel: (orcRes.data || []).reduce((s: number, o: any) => s + (o.saldo_disponivel || 0), 0),
    };

    const result = {
      ordens_servico: {
        total: osRes.data?.length || 0,
        por_status: osByStatus,
      },
      chamados: {
        total: chamadosRes.data?.length || 0,
        por_status: chamadosByStatus,
      },
      contratos: {
        total: contratosRes.data?.length || 0,
        por_status: contratosByStatus,
      },
      orcamento,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// Tool 6: criar_chamado
mcpServer.tool({
  name: "criar_chamado",
  description: "Cria um novo chamado no sistema SIMP.",
  inputSchema: {
    type: "object",
    properties: {
      tipo_demanda: { type: "string", description: "Tipo da demanda (ex: elétrica, hidráulica, civil)" },
      descricao: { type: "string", description: "Descrição detalhada do problema" },
      local_servico: { type: "string", description: "Local onde o serviço será realizado" },
      prioridade: { type: "string", description: "Prioridade: baixa, media, alta, urgente" },
      regional_id: { type: "string", description: "UUID da regional" },
      uop_id: { type: "string", description: "UUID da UOP (opcional)" },
      delegacia_id: { type: "string", description: "UUID da delegacia (opcional)" },
    },
    required: ["tipo_demanda", "descricao", "local_servico", "regional_id"],
  },
  handler: async (params: any, { request }: any) => {
    const auth = await authenticateRequest(request);
    if (auth.error) {
      return { content: [{ type: "text", text: auth.error }] };
    }

    const { data, error } = await auth.supabase!
      .from("chamados")
      .insert({
        tipo_demanda: params.tipo_demanda,
        descricao: params.descricao,
        local_servico: params.local_servico,
        prioridade: params.prioridade || "media",
        regional_id: params.regional_id,
        uop_id: params.uop_id || null,
        delegacia_id: params.delegacia_id || null,
        solicitante_id: auth.userId,
      })
      .select()
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Erro ao criar chamado: ${error.message}` }] };
    }

    return {
      content: [{ type: "text", text: `Chamado criado com sucesso: ${JSON.stringify(data, null, 2)}` }],
    };
  },
});

// ─── HTTP Transport ───────────────────────────────────────────────

const transport = new StreamableHttpTransport();
const app = new Hono();

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  await next();
  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([k, v]) => {
    c.res.headers.set(k, v);
  });
});

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
