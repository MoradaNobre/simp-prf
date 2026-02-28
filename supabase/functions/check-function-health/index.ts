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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read monitoring config
    const { data: configRows } = await supabase
      .from("monitoring_config")
      .select("config_key, config_value");

    const config: Record<string, string> = {};
    (configRows || []).forEach((r: any) => { config[r.config_key] = r.config_value; });

    const alertEnabled = config.alert_enabled !== "false";
    const threshold = parseInt(config.alert_threshold_percent || "20", 10);
    const windowMinutes = parseInt(config.alert_check_window_minutes || "60", 10);
    let recipients: string[] = [];
    try { recipients = JSON.parse(config.alert_email_recipients || "[]"); } catch { /* empty */ }

    if (!alertEnabled) {
      return new Response(JSON.stringify({ status: "alerts_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query logs within the window
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from("edge_function_logs")
      .select("function_name, success")
      .gte("created_at", since);

    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ status: "no_data", window_minutes: windowMinutes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate per-function failure rate
    const stats: Record<string, { total: number; failures: number }> = {};
    for (const log of logs) {
      if (!stats[log.function_name]) stats[log.function_name] = { total: 0, failures: 0 };
      stats[log.function_name].total++;
      if (!log.success) stats[log.function_name].failures++;
    }

    const alerts: { fn: string; rate: number; total: number; failures: number }[] = [];
    for (const [fn, s] of Object.entries(stats)) {
      const rate = Math.round((s.failures / s.total) * 100);
      if (rate >= threshold) {
        alerts.push({ fn, rate, total: s.total, failures: s.failures });
      }
    }

    if (alerts.length === 0) {
      return new Response(JSON.stringify({ status: "healthy", stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send alert email if recipients configured
    let emailSent = false;
    if (recipients.length > 0 && RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);

      const alertRows = alerts
        .map(a => `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${a.fn}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">${a.rate}%</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${a.failures}/${a.total}</td>
        </tr>`)
        .join("");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background-color:#dc2626;padding:20px;text-align:center;">
            <h2 style="color:white;margin:0;">⚠️ SIMP-PRF — Alerta de Monitoramento</h2>
          </div>
          <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;">
            <p>As seguintes Edge Functions apresentaram taxa de falha acima de <strong>${threshold}%</strong> nos últimos <strong>${windowMinutes} minutos</strong>:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Função</th>
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Taxa de Falha</th>
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Falhas/Total</th>
                </tr>
              </thead>
              <tbody>${alertRows}</tbody>
            </table>
            <div style="text-align:center;margin:20px 0;">
              <a href="https://simp-prf.lovable.app/app/gestao" style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;padding:12px 30px;border-radius:6px;font-weight:bold;">Ver Dashboard de Monitoramento</a>
            </div>
          </div>
          <div style="background-color:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#888;">
            SIMP-PRF — Sistema de Manutenção Predial da PRF
          </div>
        </div>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "SIMP-PRF <noreply@simp.estudioai.site>",
          to: recipients,
          subject: `[SIMP-PRF] ⚠️ Alerta: Edge Functions com alta taxa de falha`,
          html,
        });
        emailSent = !emailError;
        if (emailError) console.error("Alert email error:", emailError);
      } catch (e) {
        console.error("Failed to send alert:", e);
      }
    }

    return new Response(JSON.stringify({ status: "alert", alerts, email_sent: emailSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
