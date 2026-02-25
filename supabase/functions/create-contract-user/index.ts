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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // Verify caller using getClaims
    const callerClient = createClient(supabaseUrl, anonKey, {
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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller role
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const allowedRoles = ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato", "preposto"];
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nome, email, telefone, funcao, contrato_id, role, app_url } = await req.json();

    if (!nome?.trim() || !email?.trim() || !contrato_id) {
      return new Response(
        JSON.stringify({ error: "Nome, e-mail e contrato são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = nome.trim();
    const userRole = role || "terceirizado";

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === trimmedEmail
    );

    let userId: string;
    let userCreated = false;
    let tempPassword: string | null = null;

    if (existingUser) {
      userId = existingUser.id;
      await adminClient
        .from("profiles")
        .update({ full_name: trimmedName, phone: telefone || null })
        .eq("user_id", userId);
    } else {
      // Create new user with a temporary password
      tempPassword = generateTempPassword();
      const { data: newUser, error: createErr } =
        await adminClient.auth.admin.createUser({
          email: trimmedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: trimmedName },
        });

      if (createErr) {
        return new Response(
          JSON.stringify({ error: "Erro ao criar usuário: " + createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      userCreated = true;

      // Update profile with phone and must_change_password flag
      await adminClient
        .from("profiles")
        .update({ 
          phone: telefone || null,
          must_change_password: true,
        })
        .eq("user_id", userId);
    }

    // Ensure user has the correct role
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingRole) {
      await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role: userRole });
    } else if (existingRole.role === "operador" && userRole !== "operador") {
      await adminClient
        .from("user_roles")
        .update({ role: userRole })
        .eq("id", existingRole.id);
    }

    // Link user to the same regional as the contract
    const { data: contrato } = await adminClient
      .from("contratos")
      .select("regional_id")
      .eq("id", contrato_id)
      .maybeSingle();

    if (contrato?.regional_id) {
      await adminClient
        .from("profiles")
        .update({ regional_id: contrato.regional_id })
        .eq("user_id", userId);

      const { data: existingLink } = await adminClient
        .from("user_regionais")
        .select("id")
        .eq("user_id", userId)
        .eq("regional_id", contrato.regional_id)
        .maybeSingle();

      if (!existingLink) {
        await adminClient
          .from("user_regionais")
          .insert({ user_id: userId, regional_id: contrato.regional_id });
      }
    }

    // If preposto, update the contract's preposto fields
    if (userRole === "preposto") {
      await adminClient
        .from("contratos")
        .update({
          preposto_user_id: userId,
          preposto_nome: trimmedName,
          preposto_email: trimmedEmail,
          preposto_telefone: telefone || null,
        })
        .eq("id", contrato_id);
    }

    // Create contrato_contato link
    const { data: contatoData, error: contatoErr } = await adminClient
      .from("contrato_contatos")
      .insert({
        contrato_id,
        nome: trimmedName,
        email: trimmedEmail,
        telefone: telefone || null,
        funcao: funcao || null,
        user_id: userId,
      })
      .select()
      .single();

    if (contatoErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao vincular ao contrato: " + contatoErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email with credentials if user was just created
    let emailSent = false;
    if (userCreated && tempPassword && RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      const loginUrl = app_url ? `${app_url}/login` : "https://simp-prf.lovable.app/login";
      try {
        const { error: emailError } = await resend.emails.send({
          from: "SIMP-PRF <noreply@simp.estudioai.site>",
          to: [trimmedEmail],
          subject: "[SIMP-PRF] Sua conta foi criada — Acesse o sistema",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a5f;">SIMP-PRF — Bem-vindo(a) ao Sistema</h2>
              <p>Olá, <strong>${trimmedName}</strong>!</p>
              <p>Uma conta foi criada para você no <strong>SIMP-PRF</strong> (Sistema de Manutenção Predial da PRF).</p>
              <p>Utilize as credenciais abaixo para acessar o sistema:</p>
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>E-mail:</strong> ${trimmedEmail}</p>
                <p style="margin: 4px 0;"><strong>Senha temporária:</strong> ${tempPassword}</p>
              </div>
              <p style="color: #dc2626; font-weight: bold;">⚠️ Por segurança, você deverá trocar sua senha no primeiro acesso.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" 
                   style="background-color: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Acessar o Sistema
                </a>
              </div>
              <p style="color: #666; font-size: 13px;">Se você não reconhece esta solicitação, ignore este e-mail.</p>
            </div>
          `,
        });

        emailSent = !emailError;
        if (emailError) {
          console.error("Resend error:", emailError);
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contato: contatoData,
        user_created: userCreated,
        user_id: userId,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specials = "!@#$%";
  let pw = "";
  for (let i = 0; i < 10; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  pw += specials[Math.floor(Math.random() * specials.length)];
  return pw;
}
