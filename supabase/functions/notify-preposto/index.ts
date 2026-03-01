import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE = /^https?:\/\/.{1,500}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(RESEND_API_KEY);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Auth & Role Check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const allowedRoles = ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato"];
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input Validation ---
    const body = await req.json();
    const { os_id, contrato_id, app_url } = body;

    if (!os_id || typeof os_id !== "string" || !UUID_RE.test(os_id)) {
      return new Response(JSON.stringify({ error: "os_id inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contrato_id || typeof contrato_id !== "string" || !UUID_RE.test(contrato_id)) {
      return new Response(JSON.stringify({ error: "contrato_id inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (app_url && (typeof app_url !== "string" || !URL_RE.test(app_url))) {
      return new Response(JSON.stringify({ error: "app_url inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Business Logic ---
    const { data: contrato, error: cErr } = await supabase
      .from("contratos")
      .select("numero, empresa, preposto_nome, preposto_email")
      .eq("id", contrato_id)
      .single();

    if (cErr || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contrato.preposto_email) {
      return new Response(JSON.stringify({ error: "Preposto sem e-mail configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("codigo, titulo")
      .eq("id", os_id)
      .single();

    if (osErr || !os) {
      return new Response(JSON.stringify({ error: "OS não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = app_url || "https://simp-prf.lovable.app";
    const selectionUrl = `${baseUrl}/definir-responsavel/${os_id}`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "SIMP-PRF <noreply@simp.estudioai.site>",
      to: [contrato.preposto_email],
      subject: `[SIMP-PRF] Definir responsável - ${os.codigo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">SIMP-PRF — Nova Ordem de Serviço Encaminhada</h2>
          <p>Olá, <strong>${escapeHtml(contrato.preposto_nome ?? "Preposto")}</strong>!</p>
          <p>A Ordem de Serviço <strong>${escapeHtml(os.codigo)} — ${escapeHtml(os.titulo)}</strong> foi vinculada ao contrato 
          <strong>${escapeHtml(contrato.numero)} (${escapeHtml(contrato.empresa)})</strong> e está aguardando orçamento.</p>
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
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(JSON.stringify({ 
        success: false, 
        warning: "Email não enviado. Tente novamente mais tarde.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: emailData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Erro notify-preposto:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
