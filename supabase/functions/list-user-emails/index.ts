import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = data.claims.sub;

    // Check if user is gestor_nacional or gestor_master
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    if (!roleData || (roleData.role !== "gestor_nacional" && roleData.role !== "gestor_master")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;

    const emailMap: Record<string, { email: string; confirmed: boolean }> = {};
    (usersData?.users || []).forEach((u) => {
      if (u.email) emailMap[u.id] = { email: u.email, confirmed: !!u.email_confirmed_at };
    });

    return new Response(JSON.stringify(emailMap), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Erro list-user-emails:", err);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
