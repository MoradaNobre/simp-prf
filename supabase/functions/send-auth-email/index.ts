import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
const URL_RE = /^https?:\/\/.{1,500}$/;

type EmailType = "recovery" | "signup" | "invite";
const VALID_TYPES: EmailType[] = ["recovery", "signup", "invite"];

interface EmailTemplate {
  subject: string;
  title: string;
  description: string;
  buttonText: string;
  footer: string;
  color: string;
  needsLink: boolean;
}

const emailTemplates: Record<EmailType, EmailTemplate> = {
  recovery: {
    subject: "Redefinição de senha - SIMP-PRF",
    title: "Redefinição de Senha",
    description:
      "Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.",
    buttonText: "Redefinir Senha",
    footer:
      "Se você não solicitou esta alteração, ignore este e-mail. O link expira em 24 horas.",
    color: "#1a3a5c",
    needsLink: true,
  },
  signup: {
    subject: "Confirme seu cadastro - SIMP-PRF",
    title: "Confirme seu Cadastro",
    description:
      "Sua conta foi criada no Sistema de Manutenção Predial. Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.",
    buttonText: "Confirmar E-mail",
    footer: "Se você não solicitou este cadastro, ignore este e-mail. O link expira em 24 horas.",
    color: "#1a3a5c",
    needsLink: true,
  },
  invite: {
    subject: "Você foi convidado para o SIMP-PRF",
    title: "Você foi Convidado!",
    description:
      "Você recebeu um convite para acessar o SIMP-PRF. Clique no botão abaixo para aceitar o convite e configurar sua conta.",
    buttonText: "Aceitar Convite",
    footer: "Se você não reconhece este convite, ignore este e-mail.",
    color: "#1a3a5c",
    needsLink: true,
  },
};

function buildEmailHtml(template: EmailTemplate, actionUrl: string): string {
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

    const resend = new Resend(RESEND_API_KEY);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Auth Check (optional for recovery, required for invite/signup) ---
    const authHeader = req.headers.get("Authorization");

    const body = await req.json();
    const { email, type, redirect_to, app_url } = body as {
      email: string;
      type: string;
      redirect_to?: string;
      app_url?: string;
    };

    // --- Input Validation ---
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 320) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || !VALID_TYPES.includes(type as EmailType)) {
      return new Response(
        JSON.stringify({ error: "Tipo inválido. Deve ser: recovery, signup ou invite" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (redirect_to && (typeof redirect_to !== "string" || !URL_RE.test(redirect_to))) {
      return new Response(
        JSON.stringify({ error: "redirect_to inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (app_url && (typeof app_url !== "string" || !URL_RE.test(app_url))) {
      return new Response(
        JSON.stringify({ error: "app_url inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For invite type, require authenticated caller with manager/fiscal role
    if (type === "invite") {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: callerRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", claimsData.claims.sub)
        .maybeSingle();
      const allowedRoles = ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato"];
      if (!callerRole || !allowedRoles.includes(callerRole.role)) {
        return new Response(JSON.stringify({ error: "Sem permissão" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Generate Link & Send Email ---
    const template = emailTemplates[type as EmailType];
    let actionUrl: string;

    if (template.needsLink) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
          JSON.stringify({ error: "Erro ao gerar link de autenticação." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      actionUrl = linkData?.properties?.action_link || "";
      if (!actionUrl) {
        return new Response(
          JSON.stringify({ error: "Falha ao gerar link de ação" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const baseUrl = app_url || redirect_to || "https://simp-prf.lovable.app";
      actionUrl = `${baseUrl}/login`;
    }

    const html = buildEmailHtml(template, actionUrl);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "SIMP-PRF <noreply@simp.estudioai.site>",
      to: [email.trim().toLowerCase()],
      subject: template.subject,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar e-mail." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailData?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro send-auth-email:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
