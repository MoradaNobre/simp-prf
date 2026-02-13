import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type OrdemServico = Tables<"ordens_servico"> & {
  uops?: { nome: string; delegacia_id?: string } | null;
};

export function useOrdensServico(filters?: {
  status?: string;
  prioridade?: string;
  search?: string;
  regionalId?: string | null;
}) {
  return useQuery({
    queryKey: ["ordens_servico", filters],
    queryFn: async () => {
      let q = supabase
        .from("ordens_servico")
        .select("*, uops(nome, delegacia_id)")
        .order("data_abertura", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status as any);
      if (filters?.prioridade) q = q.eq("prioridade", filters.prioridade as any);
      if (filters?.search) q = q.or(`titulo.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;

      let result = data as OrdemServico[];

      // Filter by regional: need to check uop -> delegacia -> regional
      if (filters?.regionalId) {
        // Get delegacias for this regional
        const { data: delegacias } = await supabase
          .from("delegacias")
          .select("id")
          .eq("regional_id", filters.regionalId);
        
        const delegaciaIds = new Set((delegacias ?? []).map(d => d.id));
        result = result.filter(os => {
          const delegaciaId = (os.uops as any)?.delegacia_id;
          return delegaciaId && delegaciaIds.has(delegaciaId);
        });
      }

      return result;
    },
  });
}

export function useCreateOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (os: TablesInsert<"ordens_servico">) => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .insert(os)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
  });
}

export function useUpdateOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"ordens_servico"> & { id: string }) => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
  });
}

export function useOSCustos(osId?: string) {
  return useQuery({
    queryKey: ["os_custos", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos")
        .select("*")
        .eq("os_id", osId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!osId,
  });
}

export function useAddCusto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (custo: { os_id: string; descricao: string; tipo: string; valor: number }) => {
      const { data, error } = await supabase
        .from("os_custos")
        .insert(custo)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["os_custos", vars.os_id] }),
  });
}

export function useDeleteOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
  });
}
