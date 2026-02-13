import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Contrato = Tables<"contratos">;
export type ContratoContato = Tables<"contrato_contatos">;

export function useContratos() {
  return useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    },
  });
}

export function useContratoContatos(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["contrato-contatos", contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from("contrato_contatos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ContratoContato[];
    },
    enabled: !!contratoId,
  });
}

export function useCreateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contrato: TablesInsert<"contratos">) => {
      const { data, error } = await supabase.from("contratos").insert(contrato).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });
}

export function useCreateContratoContato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contato: TablesInsert<"contrato_contatos">) => {
      const { data, error } = await supabase.from("contrato_contatos").insert(contato).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["contrato-contatos", vars.contrato_id] }),
  });
}

export function useDeleteContratoContato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contratoId }: { id: string; contratoId: string }) => {
      const { error } = await supabase.from("contrato_contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["contrato-contatos", vars.contratoId] }),
  });
}
