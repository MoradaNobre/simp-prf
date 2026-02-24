import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LimiteModalidade {
  id: string;
  regional_id: string;
  modalidade: string;
  ano: number;
  valor_limite: number;
  created_at: string;
  updated_at: string;
}

export function useLimitesModalidade(regionalId?: string | null, ano?: number) {
  const currentYear = ano ?? new Date().getFullYear();
  return useQuery({
    queryKey: ["limites-modalidade", regionalId, currentYear],
    queryFn: async () => {
      let q = supabase
        .from("limites_modalidade")
        .select("*")
        .eq("ano", currentYear)
        .order("modalidade");
      if (regionalId) q = q.eq("regional_id", regionalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as LimiteModalidade[];
    },
  });
}

export function useUpsertLimiteModalidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (limite: { id?: string; regional_id: string; modalidade: string; ano: number; valor_limite: number }) => {
      if (limite.id) {
        const { data, error } = await supabase
          .from("limites_modalidade")
          .update({ valor_limite: limite.valor_limite, updated_at: new Date().toISOString() })
          .eq("id", limite.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("limites_modalidade")
          .insert({
            regional_id: limite.regional_id,
            modalidade: limite.modalidade,
            ano: limite.ano,
            valor_limite: limite.valor_limite,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["limites-modalidade"] }),
  });
}

export function useDeleteLimiteModalidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("limites_modalidade").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["limites-modalidade"] }),
  });
}
