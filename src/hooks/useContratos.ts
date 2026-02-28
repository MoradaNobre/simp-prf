import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Contrato = Tables<"contratos">;
export type ContratoContato = Tables<"contrato_contatos">;

export function useContratos(regionalId?: string | null, prepostoUserId?: string | null) {
  return useQuery({
    queryKey: ["contratos", regionalId, prepostoUserId],
    queryFn: async () => {
      let q = supabase
        .from("contratos")
        .select("*, regionais(nome, sigla)")
        .order("created_at", { ascending: false });

      if (regionalId) {
        q = q.eq("regional_id", regionalId);
      }
      if (prepostoUserId) {
        q = q.eq("preposto_user_id", prepostoUserId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useContratosSaldo() {
  return useQuery({
    queryKey: ["contratos-saldo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos_saldo" as any)
        .select("*");
      if (error) throw error;
      return (data as any[]) ?? [];
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

export function useUpdateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesInsert<"contratos"> & { id: string }) => {
      const { data, error } = await supabase.from("contratos").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-saldo"] });
    },
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: set deleted_at instead of physical deletion
      const { error } = await supabase
        .from("contratos")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-saldo"] });
    },
  });
}
