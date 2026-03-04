import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Chamado {
  id: string;
  codigo: string;
  tipo_demanda: string;
  descricao: string;
  local_servico: string;
  prioridade: string;
  justificativa_urgente: string | null;
  regional_id: string | null;
  delegacia_id: string | null;
  uop_id: string | null;
  foto: string | null;
  solicitante_id: string;
  os_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  gut_gravidade: number | null;
  gut_urgencia: number | null;
  gut_tendencia: number | null;
  gut_score: number | null;
  // joined
  solicitante_profile?: { full_name: string; phone: string | null } | null;
  regionais?: { sigla: string; nome: string } | null;
  uops?: { nome: string } | null;
  delegacias?: { nome: string } | null;
}

export function useChamados(filters?: { status?: string; regionalId?: string | null; search?: string }) {
  return useQuery({
    queryKey: ["chamados", filters],
    queryFn: async () => {
      let q = supabase
        .from("chamados")
        .select("*, regionais(sigla, nome), delegacias(nome), uops(nome)")
        .order("gut_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.regionalId) q = q.eq("regional_id", filters.regionalId);
      if (filters?.search) q = q.or(`codigo.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,tipo_demanda.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;

      let result = data as Chamado[];

      // Fetch solicitante profiles
      const solicitanteIds = [...new Set(result.map(c => c.solicitante_id))];
      if (solicitanteIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", solicitanteIds);
        const profileMap = new Map((profiles ?? []).map(p => [p.user_id, { full_name: p.full_name, phone: p.phone }]));
        result = result.map(c => ({
          ...c,
          solicitante_profile: profileMap.get(c.solicitante_id) ?? { full_name: "", phone: null },
        }));
      }

      return result;
    },
  });
}

export function useCreateChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chamado: {
      tipo_demanda: string;
      descricao: string;
      local_servico: string;
      prioridade: string;
      justificativa_urgente?: string | null;
      regional_id?: string | null;
      delegacia_id?: string | null;
      uop_id?: string | null;
      foto?: string | null;
      solicitante_id: string;
    }) => {
      const { data, error } = await supabase
        .from("chamados")
        .insert(chamado as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chamados"] }),
  });
}

export function useUpdateChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("chamados")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chamados"] }),
  });
}

export function useDeleteChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: set deleted_at instead of physical deletion
      const { data, error } = await supabase
        .from("chamados")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Não foi possível excluir o chamado. Verifique suas permissões.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chamados"] }),
  });
}
