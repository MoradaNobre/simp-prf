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
    // Validate caller is authenticated
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

    // Verify caller using getClaims (compatible with signing-keys)
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

    const callerId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller role
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const allowedRoles = ["gestor_nacional", "fiscal_contrato", "preposto"];
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nome, email, telefone, funcao, contrato_id, role } = await req.json();

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

    if (existingUser) {
      userId = existingUser.id;
      // Update profile name/phone if needed
      await adminClient
        .from("profiles")
        .update({ full_name: trimmedName, phone: telefone || null })
        .eq("user_id", userId);
    } else {
      // Create new user with invite (auto-generates password reset link)
      const tempPassword = crypto.randomUUID();
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

      // Update profile with phone
      if (telefone) {
        await adminClient
          .from("profiles")
          .update({ phone: telefone })
          .eq("user_id", userId);
      }
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
      // Upgrade from default operador to the requested role
      await adminClient
        .from("user_roles")
        .update({ role: userRole })
        .eq("id", existingRole.id);
    }

    // Create contrato_contato link
    const { data: contato, error: contatoErr } = await adminClient
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

    return new Response(
      JSON.stringify({
        success: true,
        contato,
        user_created: !existingUser,
        user_id: userId,
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
