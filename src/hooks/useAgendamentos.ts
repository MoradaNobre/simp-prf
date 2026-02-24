import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Agendamento {
  id: string;
  os_id: string;
  data_agendamento: string;
  descricao: string;
  responsavel_tecnico: string;
  status: string;
  observacoes_pos_visita: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  ordens_servico?: {
    codigo: string;
    titulo: string;
    status: string;
    regional_id: string | null;
    uop_id: string | null;
    uops?: { nome: string } | null;
  } | null;
}

export function useAgendamentos(filters?: { osId?: string; month?: number; year?: number }) {
  return useQuery({
    queryKey: ["agendamentos_visita", filters],
    queryFn: async () => {
      let q = supabase
        .from("agendamentos_visita")
        .select("*, ordens_servico(codigo, titulo, status, regional_id, uop_id, uops(nome))")
        .order("data_agendamento", { ascending: true });

      if (filters?.osId) {
        q = q.eq("os_id", filters.osId);
      }

      if (filters?.month !== undefined && filters?.year !== undefined) {
        const start = new Date(filters.year, filters.month, 1).toISOString();
        const end = new Date(filters.year, filters.month + 1, 0, 23, 59, 59).toISOString();
        q = q.gte("data_agendamento", start).lte("data_agendamento", end);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Agendamento[];
    },
  });
}

export function useCreateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agendamento: {
      os_id: string;
      data_agendamento: string;
      descricao: string;
      responsavel_tecnico: string;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("agendamentos_visita")
        .insert(agendamento)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos_visita"] }),
  });
}

export function useUpdateAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; observacoes_pos_visita?: string; data_agendamento?: string; descricao?: string; responsavel_tecnico?: string }) => {
      const { data, error } = await supabase
        .from("agendamentos_visita")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos_visita"] }),
  });
}

export function useDeleteAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agendamentos_visita").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agendamentos_visita"] }),
  });
}
