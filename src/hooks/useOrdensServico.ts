import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type OrdemServico = Tables<"ordens_servico"> & {
  uops?: { nome: string; delegacia_id?: string; delegacias?: { nome: string; regional_id?: string; regionais?: { sigla: string; nome: string } | null } | null } | null;
  regionais?: { sigla: string; nome: string } | null;
  contratos?: { preposto_nome: string | null; preposto_telefone: string | null } | null;
  solicitante_profile?: { full_name: string; phone: string | null } | null;
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
        .select("*, uops(nome, delegacia_id, delegacias(nome, regional_id, regionais(sigla, nome))), regionais(sigla, nome), contratos(preposto_nome, preposto_telefone)")
        .order("data_abertura", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status as any);
      if (filters?.prioridade) q = q.eq("prioridade", filters.prioridade as any);
      if (filters?.search) q = q.or(`titulo.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;

      let result = data as OrdemServico[];

      // Filter by regional: check direct regional_id or via uop -> delegacia -> regional
      if (filters?.regionalId) {
        const { data: delegacias } = await supabase
          .from("delegacias")
          .select("id")
          .eq("regional_id", filters.regionalId);
        
        const delegaciaIds = new Set((delegacias ?? []).map(d => d.id));
        result = result.filter(os => {
          // Direct regional_id match
          if ((os as any).regional_id === filters!.regionalId) return true;
          // Via UOP chain
          const delegaciaId = (os.uops as any)?.delegacia_id;
          return delegaciaId && delegaciaIds.has(delegaciaId);
        });
      }

      // Fetch solicitante names and phones
      const solicitanteIds = [...new Set(result.map(os => os.solicitante_id))];
      if (solicitanteIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", solicitanteIds);
        const profileMap = new Map((profiles ?? []).map(p => [p.user_id, { full_name: p.full_name, phone: p.phone }]));
        result = result.map(os => ({
          ...os,
          solicitante_profile: profileMap.get(os.solicitante_id) ?? { full_name: "", phone: null },
        }));
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

/**
 * Atomic OS status transition — prevents race conditions via SELECT … FOR UPDATE.
 * If another user already changed the status, a descriptive error is raised.
 */
export function useTransitionOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      expectedStatus,
      newStatus,
      updates,
    }: {
      id: string;
      expectedStatus: string;
      newStatus: string;
      updates?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc("transition_os_status", {
        _os_id: id,
        _expected_status: expectedStatus as any,
        _new_status: newStatus as any,
        _updates: updates ? JSON.stringify(updates) : "{}",
      });
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
      const { error } = await supabase.rpc("soft_delete_ordem_servico" as any, { _os_id: id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
  });
}
