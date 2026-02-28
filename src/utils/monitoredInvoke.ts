import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper around supabase.functions.invoke that logs execution metrics
 * to the edge_function_logs table for monitoring purposes.
 */
export async function monitoredInvoke<T = any>(
  functionName: string,
  options?: { body?: any; headers?: Record<string, string> }
): Promise<{ data: T | null; error: any }> {
  const start = performance.now();
  let statusCode = 200;
  let success = true;
  let errorMessage: string | null = null;

  try {
    const result = await supabase.functions.invoke(functionName, options);
    const latency = Math.round(performance.now() - start);

    if (result.error) {
      success = false;
      statusCode = 500;
      errorMessage = result.error.message || JSON.stringify(result.error);
    }

    // Log asynchronously (don't block the caller)
    logExecution(functionName, statusCode, success, latency, errorMessage).catch(console.error);

    return result as { data: T | null; error: any };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    success = false;
    statusCode = 500;
    errorMessage = err?.message || "Unknown error";

    logExecution(functionName, statusCode, success, latency, errorMessage).catch(console.error);

    return { data: null, error: err };
  }
}

async function logExecution(
  functionName: string,
  statusCode: number,
  success: boolean,
  latencyMs: number,
  errorMessage: string | null
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from("edge_function_logs" as any).insert({
    function_name: functionName,
    status_code: statusCode,
    success,
    latency_ms: latencyMs,
    error_message: errorMessage,
    request_method: "POST",
    caller_id: user?.id || null,
  });
}
