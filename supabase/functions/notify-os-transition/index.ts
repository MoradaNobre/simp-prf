import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ["aberta", "orcamento", "autorizacao", "execucao", "ateste", "faturamento", "pagamento", "encerrada"];

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  orcamento: "Orçamento",
  autorizacao: "Aguardando Autorização",
  execucao: "Execução",
  ateste: "Ateste",
  faturamento: "Faturamento",
  pagamento: "Pagamento",
  encerrada: "Encerrada",
};

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

    const allowedRoles = ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato", "preposto", "terceirizado"];
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input Validation ---
    const body = await req.json();
    const { os_id, from_status, to_status, motivo_restituicao } = body;

    if (!os_id || typeof os_id !== "string" || !UUID_RE.test(os_id)) {
      return new Response(JSON.stringify({ error: "os_id inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof from_status !== "string" || !VALID_STATUSES.includes(from_status)) {
      return new Response(JSON.stringify({ error: "from_status inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof to_status !== "string" || !VALID_STATUSES.includes(to_status)) {
      return new Response(JSON.stringify({ error: "to_status inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (motivo_restituicao !== undefined && motivo_restituicao !== null) {
      if (typeof motivo_restituicao !== "string" || motivo_restituicao.length > 2000) {
        return new Response(JSON.stringify({ error: "motivo_restituicao inválido (máx 2000 caracteres)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Business Logic (unchanged) ---
    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, codigo, titulo, descricao, contrato_id, regional_id, uop_id, valor_orcamento, responsavel_execucao_id")
      .eq("id", os_id)
      .single();

    if (osErr || !os) {
      return new Response(JSON.stringify({ error: "OS não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let regionalId = os.regional_id;
    if (!regionalId && os.uop_id) {
      const { data: uop } = await supabase.from("uops").select("delegacia_id").eq("id", os.uop_id).single();
      if (uop?.delegacia_id) {
        const { data: del } = await supabase.from("delegacias").select("regional_id").eq("id", uop.delegacia_id).single();
        if (del) regionalId = del.regional_id;
      }
    }

    const recipientEmails: string[] = [];
    const isRestitution = motivo_restituicao && from_status !== to_status;

    if (isRestitution) {
      switch (to_status) {
        case "orcamento":
        case "faturamento":
        case "pagamento":
          await addPrepostoEmails(supabase, os.contrato_id, recipientEmails);
          break;
        case "execucao":
          await addPrepostoEmails(supabase, os.contrato_id, recipientEmails);
          if (os.responsavel_execucao_id) {
            const { data: contato } = await supabase.from("contrato_contatos").select("email").eq("id", os.responsavel_execucao_id).maybeSingle();
            if (contato?.email && !recipientEmails.includes(contato.email)) recipientEmails.push(contato.email);
          }
          break;
        case "autorizacao":
        case "ateste":
          await addRegionalGestorEmails(supabase, regionalId, recipientEmails);
          await addFiscalEmails(supabase, recipientEmails);
          break;
      }
    } else {
      switch (to_status) {
        case "aberta":
          await addRegionalGestorEmails(supabase, regionalId, recipientEmails);
          break;
        case "orcamento":
          await addPrepostoEmails(supabase, os.contrato_id, recipientEmails);
          break;
        case "autorizacao":
        case "ateste":
        case "pagamento":
          await addRegionalGestorEmails(supabase, regionalId, recipientEmails);
          await addFiscalEmails(supabase, recipientEmails);
          break;
        case "execucao":
          await addPrepostoEmails(supabase, os.contrato_id, recipientEmails);
          if (os.responsavel_execucao_id) {
            const { data: contato } = await supabase.from("contrato_contatos").select("email").eq("id", os.responsavel_execucao_id).maybeSingle();
            if (contato?.email && !recipientEmails.includes(contato.email)) recipientEmails.push(contato.email);
          }
          break;
        case "faturamento":
          await addPrepostoEmails(supabase, os.contrato_id, recipientEmails);
          break;
        case "encerrada":
          await addRegionalGestorEmails(supabase, regionalId, recipientEmails);
          await addFiscalEmails(supabase, recipientEmails);
          await addPrepostoEmails(supabase, os.contrato_id, recipientEmails);
          break;
      }
    }

    if (recipientEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, warning: "No recipient emails found", recipients: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = buildEmail(os, from_status, to_status, isRestitution ? motivo_restituicao : undefined);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "SIMP-PRF <noreply@simp.estudioai.site>",
      to: recipientEmails,
      subject,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(JSON.stringify({
        success: false,
        warning: "Email não enviado. Tente novamente mais tarde.",
        recipients: recipientEmails,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: emailData?.id, recipients: recipientEmails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Erro notify-os-transition:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Helper functions ---

async function addPrepostoEmails(supabase: any, contratoId: string | null, emails: string[]) {
  if (!contratoId) return;
  const { data: contrato } = await supabase.from("contratos").select("preposto_email, preposto_user_id").eq("id", contratoId).single();
  if (!contrato) return;

  let email: string | null = null;
  if (contrato.preposto_email) {
    if (typeof contrato.preposto_email === "string") {
      try { const parsed = JSON.parse(contrato.preposto_email); email = parsed.email || null; } catch { email = contrato.preposto_email; }
    } else if (typeof contrato.preposto_email === "object" && contrato.preposto_email.email) {
      email = contrato.preposto_email.email;
    }
  }

  if (!email && contrato.preposto_user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(contrato.preposto_user_id);
    if (userData?.user?.email) email = userData.user.email;
  }

  if (email && !emails.includes(email)) emails.push(email);
}

async function addRegionalGestorEmails(supabase: any, regionalId: string | null, emails: string[]) {
  if (!regionalId) return;
  const { data: userRegionais } = await supabase.from("user_regionais").select("user_id").eq("regional_id", regionalId);
  if (!userRegionais?.length) return;

  const userIds = userRegionais.map((ur: any) => ur.user_id);
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "gestor_regional").in("user_id", userIds);
  if (!roles?.length) return;

  for (const r of roles) {
    const { data: userData } = await supabase.auth.admin.getUserById(r.user_id);
    if (userData?.user?.email && !emails.includes(userData.user.email)) emails.push(userData.user.email);
  }
}

async function addFiscalEmails(supabase: any, emails: string[]) {
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "fiscal_contrato");
  if (!roles?.length) return;

  for (const r of roles) {
    const { data: userData } = await supabase.auth.admin.getUserById(r.user_id);
    if (userData?.user?.email && !emails.includes(userData.user.email)) emails.push(userData.user.email);
  }
}

function buildEmail(
  os: { codigo: string; titulo: string; descricao: string | null; valor_orcamento: number | null },
  fromStatus: string,
  toStatus: string,
  motivoRestituicao?: string
): { subject: string; html: string } {
  const isRestitution = !!motivoRestituicao;
  const valorFormatado = os.valor_orcamento
    ? `R$ ${Number(os.valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "—";

  const appUrl = "https://simp-prf.lovable.app/app/ordens";

  let subject: string;
  let actionTitle: string;
  let actionDescription: string;
  let actionColor = "#1e3a5f";

  const safeCode = escapeHtml(os.codigo);
  const safeTitle = escapeHtml(os.titulo);

  if (isRestitution) {
    subject = `[SIMP-PRF] OS Restituída - ${os.codigo}`;
    actionTitle = "OS Restituída — Ação Necessária";
    actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi restituída de <strong>${statusLabels[fromStatus]}</strong> para <strong>${statusLabels[toStatus]}</strong>.`;
    actionColor = "#dc2626";
  } else {
    switch (toStatus) {
      case "aberta":
        subject = `[SIMP-PRF] Nova OS Aberta - ${os.codigo}`;
        actionTitle = "Nova Ordem de Serviço";
        actionDescription = `Uma nova Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi aberta na sua regional e aguarda encaminhamento.`;
        actionColor = "#2563eb";
        break;
      case "orcamento":
        subject = `[SIMP-PRF] Nova OS para Orçamento - ${os.codigo}`;
        actionTitle = "Nova OS Aguardando Orçamento";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi vinculada ao seu contrato e está aguardando a elaboração do orçamento.`;
        break;
      case "autorizacao":
        subject = `[SIMP-PRF] OS para Autorização - ${os.codigo}`;
        actionTitle = "OS Aguardando Autorização";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> teve o orçamento enviado (${valorFormatado}) e aguarda sua análise e autorização.`;
        break;
      case "execucao":
        subject = `[SIMP-PRF] OS Autorizada para Execução - ${os.codigo}`;
        actionTitle = "OS Autorizada — Iniciar Execução";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi autorizada e está pronta para execução. Valor aprovado: ${valorFormatado}.`;
        actionColor = "#16a34a";
        break;
      case "ateste":
        subject = `[SIMP-PRF] OS para Ateste - ${os.codigo}`;
        actionTitle = "OS Aguardando Ateste";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> teve a execução concluída e aguarda sua validação (ateste do serviço).`;
        break;
      case "faturamento":
        subject = `[SIMP-PRF] OS para Faturamento - ${os.codigo}`;
        actionTitle = "OS Aguardando Nota Fiscal e Certidões";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi atestada. Emita a nota fiscal e junte as certidões exigidas para prosseguir com o pagamento. Valor: ${valorFormatado}.`;
        actionColor = "#ca8a04";
        break;
      case "pagamento":
        subject = `[SIMP-PRF] OS para Pagamento - ${os.codigo}`;
        actionTitle = "OS Aguardando Pagamento";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> teve a nota fiscal e certidões anexadas e aguarda o processamento do pagamento. Valor: ${valorFormatado}.`;
        break;
      case "encerrada":
        subject = `[SIMP-PRF] OS Encerrada - ${os.codigo}`;
        actionTitle = "OS Encerrada";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi encerrada com sucesso. Valor final: ${valorFormatado}.`;
        actionColor = "#6b7280";
        break;
      default:
        subject = `[SIMP-PRF] Atualização OS - ${os.codigo}`;
        actionTitle = "Atualização de OS";
        actionDescription = `A Ordem de Serviço <strong>${safeCode} — ${safeTitle}</strong> foi atualizada de ${statusLabels[fromStatus]} para ${statusLabels[toStatus]}.`;
    }
  }

  const motivoHtml = motivoRestituicao
    ? `<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 15px 0;">
        <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 13px;">Motivo da restituição:</p>
        <p style="margin: 5px 0 0; color: #333;">${escapeHtml(motivoRestituicao)}</p>
      </div>`
    : "";

  const descricaoHtml = os.descricao
    ? `<tr>
        <td style="padding: 6px 0; color: #666; vertical-align: top;">Descrição:</td>
        <td style="padding: 6px 0;">${escapeHtml(os.descricao)}</td>
      </tr>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${actionColor}; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">SIMP-PRF</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 13px;">Sistema de Manutenção Predial</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
        <h3 style="color: ${actionColor}; margin-top: 0;">${actionTitle}</h3>
        <p>${actionDescription}</p>
        ${motivoHtml}
        <div style="background-color: #f8f9fa; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666; width: 40%;">Código:</td>
              <td style="padding: 6px 0; font-weight: bold;">${safeCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Título:</td>
              <td style="padding: 6px 0;">${safeTitle}</td>
            </tr>
            ${descricaoHtml}
            <tr>
              <td style="padding: 6px 0; color: #666;">Status atual:</td>
              <td style="padding: 6px 0; font-weight: bold;">${statusLabels[toStatus] || toStatus}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin: 25px 0 15px;">
          <a href="${appUrl}" style="display: inline-block; background-color: ${actionColor}; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px;">Acessar o Sistema</a>
        </div>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
        SIMP-PRF — Sistema de Manutenção Predial da PRF
      </div>
    </div>
  `;

  return { subject, html };
}
