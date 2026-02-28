import { supabase } from "@/integrations/supabase/client";

// ─── Circuit Breaker ──────────────────────────────────────────────
type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerEntry {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

const CIRCUIT_FAILURE_THRESHOLD = 5;   // open after 5 consecutive failures
const CIRCUIT_RESET_TIMEOUT = 60_000;  // try again after 60 s

const circuits: Record<string, CircuitBreakerEntry> = {};

function getCircuit(fn: string): CircuitBreakerEntry {
  if (!circuits[fn]) {
    circuits[fn] = { state: "closed", failures: 0, lastFailure: 0, nextAttempt: 0 };
  }
  return circuits[fn];
}

function recordSuccess(fn: string) {
  const cb = getCircuit(fn);
  cb.state = "closed";
  cb.failures = 0;
}

function recordFailure(fn: string) {
  const cb = getCircuit(fn);
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    cb.state = "open";
    cb.nextAttempt = Date.now() + CIRCUIT_RESET_TIMEOUT;
    console.warn(`[CircuitBreaker] "${fn}" → OPEN (${cb.failures} falhas consecutivas). Retry em ${CIRCUIT_RESET_TIMEOUT / 1000}s.`);
  }
}

function canAttempt(fn: string): boolean {
  const cb = getCircuit(fn);
  if (cb.state === "closed") return true;
  if (cb.state === "open" && Date.now() >= cb.nextAttempt) {
    cb.state = "half-open";
    return true;
  }
  return cb.state === "half-open";
}

// ─── Retry with exponential backoff ───────────────────────────────
const DEFAULT_MAX_RETRIES = 2;       // up to 2 retries (3 total attempts)
const BASE_DELAY_MS = 1000;          // 1s, 2s, 4s …

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ───────────────────────────────────────────────────

export interface MonitoredInvokeOptions {
  body?: any;
  headers?: Record<string, string>;
  /** Override max retries (default 2). Set 0 to disable retry. */
  maxRetries?: number;
}

/**
 * Wrapper around supabase.functions.invoke with:
 *  - Automatic retry with exponential backoff
 *  - Per-function circuit breaker
 *  - Metric logging to edge_function_logs
 */
export async function monitoredInvoke<T = any>(
  functionName: string,
  options?: MonitoredInvokeOptions
): Promise<{ data: T | null; error: any }> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  // Circuit breaker check
  if (!canAttempt(functionName)) {
    const msg = `Circuit breaker OPEN para "${functionName}". Chamada bloqueada.`;
    console.warn(`[monitoredInvoke] ${msg}`);
    logExecution(functionName, 503, false, 0, msg).catch(console.error);
    return { data: null, error: new Error(msg) };
  }

  let lastError: any = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const start = performance.now();
    try {
      const result = await supabase.functions.invoke(functionName, {
        body: options?.body,
        headers: options?.headers,
      });
      const latency = Math.round(performance.now() - start);

      if (result.error) {
        lastError = result.error;
        const errMsg = result.error.message || JSON.stringify(result.error);
        logExecution(functionName, 500, false, latency, errMsg).catch(console.error);
        recordFailure(functionName);

        if (attempt < maxRetries) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.log(`[monitoredInvoke] Retry ${attempt + 1}/${maxRetries} para "${functionName}" em ${delay}ms`);
          await sleep(delay);
          attempt++;
          continue;
        }

        return result as { data: T | null; error: any };
      }

      // Success
      logExecution(functionName, 200, true, latency, null).catch(console.error);
      recordSuccess(functionName);
      return result as { data: T | null; error: any };
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      lastError = err;
      const errMsg = err?.message || "Unknown error";
      logExecution(functionName, 500, false, latency, errMsg).catch(console.error);
      recordFailure(functionName);

      if (attempt < maxRetries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[monitoredInvoke] Retry ${attempt + 1}/${maxRetries} para "${functionName}" em ${delay}ms`);
        await sleep(delay);
        attempt++;
        continue;
      }

      return { data: null, error: err };
    }
  }

  return { data: null, error: lastError };
}

// ─── Logging helper ───────────────────────────────────────────────

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

/** Expose circuit state for the monitoring dashboard */
export function getCircuitStates(): Record<string, CircuitBreakerEntry> {
  return { ...circuits };
}
