import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EmailType = "recovery" | "signup" | "invite";

const emailTemplates: Record<
  EmailType,
  {
    subject: string;
    title: string;
    description: string;
    buttonText: string;
    footer: string;
    color: string;
  }
> = {
  recovery: {
    subject: "Redefinição de senha - SIMP-PRF",
    title: "Redefinição de Senha",
    description:
      "Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.",
    buttonText: "Redefinir Senha",
    footer:
      "Se você não solicitou esta alteração, ignore este e-mail. O link expira em 24 horas.",
    color: "#1a3a5c",
  },
  signup: {
    subject: "Confirme seu cadastro no SIMP-PRF",
    title: "Confirme seu E-mail",
    description:
      "Olá! Recebemos uma solicitação de cadastro com este endereço de e-mail. Clique no botão abaixo para confirmar sua conta.",
    buttonText: "Confirmar Cadastro",
    footer: "Se você não solicitou este cadastro, ignore este e-mail.",
    color: "#1a3a5c",
  },
  invite: {
    subject: "Você foi convidado para o SIMP-PRF",
    title: "Você foi Convidado!",
    description:
      "Você recebeu um convite para acessar o SIMP-PRF. Clique no botão abaixo para aceitar o convite e configurar sua conta.",
    buttonText: "Aceitar Convite",
    footer: "Se você não reconhece este convite, ignore este e-mail.",
    color: "#1a3a5c",
  },
};

function buildEmailHtml(
  template: (typeof emailTemplates)[EmailType],
  actionUrl: string
): string {
  return `
<div style="max-width:520px;margin:0 auto;font-family:Arial,sans-serif;background:#f4f6f9;padding:32px 16px">
  <div style="background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <div style="width:56px;height:56px;background:${template.color};border-radius:14px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
      <span style="color:#fff;font-size:24px;font-weight:bold">&#128737;</span>
    </div>
    <h1 style="color:${template.color};font-size:22px;margin:0 0 8px">SIMP-PRF</h1>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px">Sistema de Manutenção Predial</p>
    <h2 style="color:#334155;font-size:18px;margin:0 0 12px">${template.title}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
      ${template.description}
    </p>
    <a href="${actionUrl}" style="display:inline-block;background:${template.color};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
      ${template.buttonText}
    </a>
    <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">
      ${template.footer}
    </p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { email, type, redirect_to } = await req.json() as {
      email: string;
      type: EmailType;
      redirect_to?: string;
    };

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: "email and type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailTemplates[type]) {
      return new Response(
        JSON.stringify({ error: `Invalid type: ${type}. Must be recovery, signup, or invite` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate auth link using admin API (does NOT send the default email)
    const linkType = type === "recovery" ? "recovery" : type === "signup" ? "signup" : "invite";

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: linkType,
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: redirect_to || undefined,
      },
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return new Response(
        JSON.stringify({ error: "Failed to generate action link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build branded email
    const template = emailTemplates[type];
    const html = buildEmailHtml(template, actionLink);

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SIMP-PRF <noreply@simp.estudioai.site>",
        to: [email.trim().toLowerCase()],
        subject: template.subject,
        html,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar e-mail: " + (emailData.message ?? "erro desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
