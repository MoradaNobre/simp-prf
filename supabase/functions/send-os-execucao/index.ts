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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { os_id, relatorio_execucao_id, report_data } = await req.json();

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

    // Get preposto email from contract
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

    // Get contato emails linked to the contract
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

    // Get execution responsible email if it's a user
    if (os.responsavel_execucao_id) {
      // Try as contato first
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
      // Update relatorio to mark no email sent
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

    // Build email HTML with OS execution details
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">SIMP-PRF</h2>
          <p style="color: #ccc; margin: 5px 0 0;">Sistema de Manutenção Predial</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0;">
          <h3 style="color: #1e3a5f;">Ordem de Serviço Autorizada para Execução</h3>
          <p>A Ordem de Serviço abaixo foi autorizada e está pronta para execução:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Código</td><td style="padding: 8px; border: 1px solid #ddd;">${report_data?.codigo || os.codigo}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Título</td><td style="padding: 8px; border: 1px solid #ddd;">${report_data?.titulo || os.titulo}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Local</td><td style="padding: 8px; border: 1px solid #ddd;">${report_data?.localNome || "—"}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Tipo</td><td style="padding: 8px; border: 1px solid #ddd;">${report_data?.tipo === "preventiva" ? "Preventiva" : "Corretiva"}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Orçamento</td><td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(report_data?.valorOrcamento || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td></tr>
            ${report_data?.contratoEmpresa ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Empresa</td><td style="padding: 8px; border: 1px solid #ddd;">${report_data.contratoEmpresa}</td></tr>` : ""}
            ${report_data?.responsavelExecucaoNome ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Responsável Execução</td><td style="padding: 8px; border: 1px solid #ddd;">${report_data.responsavelExecucaoNome}</td></tr>` : ""}
          </table>
          <p style="color: #666; font-size: 13px;">O PDF da Ordem de Serviço pode ser baixado diretamente no sistema SIMP-PRF na seção Relatórios → OS - Execução.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
          SIMP-PRF — Sistema de Manutenção Predial da PRF
        </div>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SIMP-PRF <onboarding@resend.dev>",
        to: emails,
        subject: `[SIMP-PRF] Ordem de Serviço Autorizada - ${os.codigo}`,
        html,
      }),
    });

    const emailData = await emailRes.json();

    // Update relatorio with email status
    if (relatorio_execucao_id) {
      await supabase
        .from("relatorios_execucao")
        .update({
          email_enviado: emailRes.ok,
          email_destinatarios: emails,
        })
        .eq("id", relatorio_execucao_id);
    }

    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(JSON.stringify({
        success: false,
        warning: "Email não enviado: " + (emailData.message ?? "erro desconhecido"),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: emailData.id, recipients: emails }), {
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
