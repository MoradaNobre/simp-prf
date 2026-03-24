import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { contrato, periodo, imrScore, situacao, totalOcorrencias, totalPontosPerdidos, ocorrencias, osConsolidadas, valorFatura, percentualRetencao, valorGlosa } = await req.json();

    const ocorrenciasTexto = (ocorrencias ?? [])
      .map((o: any) => `- ${o.os_codigo}: ${o.tipo_falha} (${o.regra_imr}, ${o.pontos} pts) — ${o.evidencia}`)
      .join("\n");

    const osTexto = (osConsolidadas ?? [])
      .map((os: any) => `- ${os.codigo}: ${os.tipo} | ${os.status} | R$ ${os.valor?.toLocaleString("pt-BR") ?? "0"}`)
      .join("\n");

    const prompt = `Você é um fiscal de contratos de manutenção predial da Polícia Rodoviária Federal (PRF). 
Elabore uma análise qualitativa técnica e objetiva para o relatório IMR (Instrumento de Medição de Resultado) com base nos dados abaixo.

A análise deve conter:
1. Avaliação geral da execução no período
2. Pontos críticos identificados (baseado nas ocorrências)
3. Padrões de reincidência (se houver)
4. Riscos operacionais identificados
5. Recomendações para o próximo período

**Dados do IMR:**
- Contrato: ${contrato?.numero ?? "N/A"} — ${contrato?.empresa ?? "N/A"}
- Período: ${periodo?.inicio ?? "N/A"} a ${periodo?.fim ?? "N/A"}
- IMR Calculado: ${imrScore?.toFixed(1) ?? "N/A"}
- Situação: ${situacao ?? "N/A"}
- Total de Ocorrências: ${totalOcorrencias ?? 0}
- Pontos Perdidos: ${totalPontosPerdidos?.toFixed(1) ?? "0"}
- Valor da Fatura: R$ ${valorFatura?.toLocaleString("pt-BR") ?? "0"}
- Retenção: ${percentualRetencao ?? 0}%
- Glosa: R$ ${valorGlosa?.toLocaleString("pt-BR") ?? "0"}

**OS do Período:**
${osTexto || "Nenhuma OS registrada."}

**Ocorrências Detectadas:**
${ocorrenciasTexto || "Nenhuma ocorrência registrada."}

Escreva em português formal, de forma técnica, impessoal e concisa (máximo 5 parágrafos). Não use markdown, apenas texto corrido.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um fiscal especialista em contratos de manutenção predial do governo federal brasileiro. Responda de forma técnica, objetiva e em português formal." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar análise com IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ analise: content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-imr-analysis error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
