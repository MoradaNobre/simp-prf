import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { os_id, contrato_id, app_url } = await req.json();

    if (!os_id || !contrato_id) {
      return new Response(JSON.stringify({ error: "os_id and contrato_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get contract info (preposto email)
    const { data: contrato, error: cErr } = await supabase
      .from("contratos")
      .select("numero, empresa, preposto_nome, preposto_email")
      .eq("id", contrato_id)
      .single();

    if (cErr || !contrato) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contrato.preposto_email) {
      return new Response(JSON.stringify({ error: "Preposto has no email configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OS info
    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("codigo, titulo")
      .eq("id", os_id)
      .single();

    if (osErr || !os) {
      return new Response(JSON.stringify({ error: "OS not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectionUrl = `${app_url}/definir-responsavel/${os_id}`;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SIMP-PRF <noreply@simp.estudioai.site>",
        to: [contrato.preposto_email],
        subject: `[SIMP-PRF] Definir responsável - ${os.codigo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">SIMP-PRF — Nova Ordem de Serviço Encaminhada</h2>
            <p>Olá, <strong>${contrato.preposto_nome ?? "Preposto"}</strong>!</p>
            <p>A Ordem de Serviço <strong>${os.codigo} — ${os.titulo}</strong> foi vinculada ao contrato 
            <strong>${contrato.numero} (${contrato.empresa})</strong> e está aguardando orçamento.</p>
            <p>Por favor, defina o responsável pela execução clicando no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${selectionUrl}" 
                 style="background-color: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Definir Responsável
              </a>
            </div>
            <p style="color: #666; font-size: 13px;">Se você não reconhece esta solicitação, ignore este email.</p>
          </div>
        `,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      // Return partial success so the OS flow isn't blocked
      return new Response(JSON.stringify({ 
        success: false, 
        warning: "Email não enviado: " + (emailData.message ?? "erro desconhecido"),
        details: emailData,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: emailData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
