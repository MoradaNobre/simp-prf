import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

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

    const resend = new Resend(RESEND_API_KEY);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { os_id, relatorio_execucao_id, report_data, pdf_base64 } = await req.json();

    if (!os_id) {
      return new Response(JSON.stringify({ error: "os_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OS with contract info
    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, codigo, titulo, contrato_id, responsavel_execucao_id")
      .eq("id", os_id)
      .single();

    if (osErr || !os) {
      return new Response(JSON.stringify({ error: "OS not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect recipient emails
    const emails: string[] = [];

    if (os.contrato_id) {
      const { data: contrato } = await supabase
        .from("contratos")
        .select("preposto_email, preposto_nome")
        .eq("id", os.contrato_id)
        .single();
      if (contrato?.preposto_email) {
        emails.push(contrato.preposto_email);
      }
    }

    if (os.contrato_id) {
      const { data: contatos } = await supabase
        .from("contrato_contatos")
        .select("email")
        .eq("contrato_id", os.contrato_id);
      if (contatos) {
        contatos.forEach(c => {
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
      if (contato?.email && !emails.includes(contato.email)) {
        emails.push(contato.email);
      }
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

    // Build email HTML
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
              <tr><td style="padding: 6px 0; color: #666; width: 40%;">Código:</td><td style="padding: 6px 0; font-weight: bold;">${report_data?.codigo || os.codigo}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Título:</td><td style="padding: 6px 0;">${report_data?.titulo || os.titulo}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Local:</td><td style="padding: 6px 0;">${report_data?.localNome || "—"}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Tipo:</td><td style="padding: 6px 0;">${report_data?.tipo === "preventiva" ? "Preventiva" : "Corretiva"}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Orçamento:</td><td style="padding: 6px 0; font-weight: bold;">R$ ${Number(report_data?.valorOrcamento || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>
              ${report_data?.contratoEmpresa ? `<tr><td style="padding: 6px 0; color: #666;">Empresa:</td><td style="padding: 6px 0;">${report_data.contratoEmpresa}</td></tr>` : ""}
              ${report_data?.responsavelExecucaoNome ? `<tr><td style="padding: 6px 0; color: #666;">Responsável:</td><td style="padding: 6px 0;">${report_data.responsavelExecucaoNome}</td></tr>` : ""}
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

    // Build Resend payload with optional PDF attachment
    const sendOptions: any = {
      from: "SIMP-PRF <noreply@simp.estudioai.site>",
      to: emails,
      subject: `[SIMP-PRF] Ordem de Serviço Autorizada - ${os.codigo}`,
      html: htmlContent,
    };

    if (pdf_base64) {
      sendOptions.attachments = [
        {
          filename: `OS_Execucao_${os.codigo}.pdf`,
          content: pdf_base64,
        },
      ];
    }

    const { data: emailData, error: emailError } = await resend.emails.send(sendOptions);

    // Update relatorio with email status
    if (relatorio_execucao_id) {
      await supabase
        .from("relatorios_execucao")
        .update({
          email_enviado: !emailError,
          email_destinatarios: emails,
        })
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
