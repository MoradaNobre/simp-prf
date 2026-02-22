import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRegionais() {
  return useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionais").select("*").order("sigla");
      if (error) throw error;
      return data;
    },
  });
}

export function useDelegacias(regionalId?: string) {
  return useQuery({
    queryKey: ["delegacias", regionalId],
    queryFn: async () => {
      let q = supabase.from("delegacias").select("*").order("nome");
      if (regionalId) q = q.eq("regional_id", regionalId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUops(delegaciaId?: string) {
  return useQuery({
    queryKey: ["uops", delegaciaId],
    queryFn: async () => {
      let q = supabase.from("uops").select("*").order("nome");
      if (delegaciaId) q = q.eq("delegacia_id", delegaciaId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

