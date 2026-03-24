import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
    const { os_id, relatorio_execucao_id, report_data, pdf_base64 } = body;

    if (!os_id || typeof os_id !== "string" || !UUID_RE.test(os_id)) {
      return new Response(JSON.stringify({ error: "os_id inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (relatorio_execucao_id && (typeof relatorio_execucao_id !== "string" || !UUID_RE.test(relatorio_execucao_id))) {
      return new Response(JSON.stringify({ error: "relatorio_execucao_id inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pdf_base64 && (typeof pdf_base64 !== "string" || pdf_base64.length > 10_000_000)) {
      return new Response(JSON.stringify({ error: "PDF excede tamanho máximo (10MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (report_data && typeof report_data !== "object") {
      return new Response(JSON.stringify({ error: "report_data inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Business Logic ---
    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, codigo, titulo, contrato_id, responsavel_execucao_id")
      .eq("id", os_id)
      .single();

    if (osErr || !os) {
      return new Response(JSON.stringify({ error: "OS não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emails: string[] = [];

    if (os.contrato_id) {
      const { data: contrato } = await supabase
        .from("contratos")
        .select("preposto_email, preposto_nome")
        .eq("id", os.contrato_id)
        .single();
      if (contrato?.preposto_email) emails.push(contrato.preposto_email);
    }

    if (os.contrato_id) {
      const { data: contatos } = await supabase
        .from("contrato_contatos")
        .select("email")
        .eq("contrato_id", os.contrato_id);
      if (contatos) {
        contatos.forEach((c: any) => {
          if (c.email && !emails.includes(c.email)) emails.push(c.email);
        });
      }
    }

    if (os.responsavel_execucao_id) {
      const { data: contato } = await supabase
        .from("contrato_contatos")
        .select("email")
        .eq("id", os.responsavel_execucao_id)
        .maybeSingle();
      if (contato?.email && !emails.includes(contato.email)) emails.push(contato.email);
    }

    if (emails.length === 0) {
      if (relatorio_execucao_id) {
        await supabase
          .from("relatorios_execucao")
          .update({ email_enviado: false, email_destinatarios: [] })
          .eq("id", relatorio_execucao_id);
      }
      return new Response(JSON.stringify({ success: true, warning: "No recipient emails found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeCodigo = escapeHtml(report_data?.codigo || os.codigo || "");
    const safeTitulo = escapeHtml(report_data?.titulo || os.titulo || "");
    const safeLocal = escapeHtml(report_data?.localNome || "—");
    const safeTipo = report_data?.tipo === "preventiva" ? "Preventiva" : "Corretiva";
    const safeEmpresa = report_data?.contratoEmpresa ? escapeHtml(report_data.contratoEmpresa) : "";
    const safeResponsavel = report_data?.responsavelExecucaoNome ? escapeHtml(report_data.responsavelExecucaoNome) : "";
    const safePrazoExecucao = report_data?.prazoExecucao ? escapeHtml(report_data.prazoExecucao) : "";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #16a34a; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">SIMP-PRF</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 13px;">Sistema de Manutenção Predial</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h3 style="color: #16a34a;">Ordem de Serviço Autorizada para Execução</h3>
          <p>A Ordem de Serviço abaixo foi autorizada e está pronta para execução.</p>
          <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin: 15px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #666; width: 40%;">Código:</td><td style="padding: 6px 0; font-weight: bold;">${safeCodigo}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Título:</td><td style="padding: 6px 0;">${safeTitulo}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Local:</td><td style="padding: 6px 0;">${safeLocal}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Tipo:</td><td style="padding: 6px 0;">${safeTipo}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Orçamento:</td><td style="padding: 6px 0; font-weight: bold;">R$ ${Number(report_data?.valorOrcamento || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>
              ${safeEmpresa ? `<tr><td style="padding: 6px 0; color: #666;">Empresa:</td><td style="padding: 6px 0;">${safeEmpresa}</td></tr>` : ""}
              ${safeResponsavel ? `<tr><td style="padding: 6px 0; color: #666;">Responsável:</td><td style="padding: 6px 0;">${safeResponsavel}</td></tr>` : ""}
            </table>
          </div>
          <p style="color: #666; font-size: 13px;">O PDF da Ordem de Serviço segue em anexo.</p>
          <div style="text-align: center; margin: 25px 0 15px;">
            <a href="https://simp-prf.lovable.app/app/ordens" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px;">Acessar o Sistema</a>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
          SIMP-PRF — Sistema de Manutenção Predial da PRF
        </div>
      </div>
    `;

    const sendOptions: any = {
      from: "SIMP-PRF <noreply@simp.estudioai.site>",
      to: emails,
      subject: `[SIMP-PRF] Ordem de Serviço Autorizada - ${os.codigo}`,
      html: htmlContent,
    };

    if (pdf_base64) {
      sendOptions.attachments = [
        { filename: `OS_Execucao_${os.codigo}.pdf`, content: pdf_base64 },
      ];
    }

    const { data: emailData, error: emailError } = await resend.emails.send(sendOptions);

    if (relatorio_execucao_id) {
      await supabase
        .from("relatorios_execucao")
        .update({ email_enviado: !emailError, email_destinatarios: emails })
        .eq("id", relatorio_execucao_id);
    }

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

    return new Response(JSON.stringify({ success: true, email_id: emailData?.id, recipients: emails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Erro send-os-execucao:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
