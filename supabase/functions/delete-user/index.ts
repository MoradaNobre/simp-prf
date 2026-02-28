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

    // Only gestor_nacional or gestor_master can delete users
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (!callerRole || (callerRole.role !== "gestor_nacional" && callerRole.role !== "gestor_master")) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "Não é possível excluir a própria conta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up references that block auth user deletion
    // Soft-delete OS where user is solicitante (instead of reassigning)
    await adminClient.from("ordens_servico").update({ deleted_at: new Date().toISOString() }).eq("solicitante_id", user_id).is("deleted_at", null);
    await adminClient.from("ordens_servico").update({ responsavel_id: null }).eq("responsavel_id", user_id);
    await adminClient.from("ordens_servico").update({ responsavel_execucao_id: null }).eq("responsavel_execucao_id", user_id);
    await adminClient.from("ordens_servico").update({ responsavel_encerramento_id: null }).eq("responsavel_encerramento_id", user_id);
    await adminClient.from("contratos").update({ preposto_user_id: null, preposto_nome: null, preposto_email: null, preposto_telefone: null }).eq("preposto_user_id", user_id);
    await adminClient.from("contrato_contatos").update({ user_id: null }).eq("user_id", user_id);
    await adminClient.from("relatorios_execucao").update({ gerado_por_id: callerId }).eq("gerado_por_id", user_id);
    await adminClient.from("relatorios_os").update({ gerado_por_id: callerId }).eq("gerado_por_id", user_id);
    await adminClient.from("orcamento_creditos").update({ created_by: callerId }).eq("created_by", user_id);
    await adminClient.from("orcamento_empenhos").update({ created_by: callerId }).eq("created_by", user_id);

    // Delete from auth (cascades to profiles, user_roles, etc.)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao excluir: " + deleteErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
