import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of OS IDs that have at least one pending budget revision.
 * Useful for showing badges in listings without fetching full revision data per OS.
 */
export function useOsComRevisaoPendente(osIds: string[]) {
  return useQuery({
    queryKey: ["os-revisao-pendente", osIds],
    queryFn: async () => {
      if (osIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("os_revisoes_orcamento" as any)
        .select("os_id")
        .in("os_id", osIds)
        .eq("status", "pendente");
      if (error) throw error;
      return new Set((data as any[]).map((r: any) => r.os_id));
    },
    enabled: osIds.length > 0,
  });
}
