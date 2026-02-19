import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContratoAditivo {
  id: string;
  contrato_id: string;
  valor: number;
  descricao: string;
  numero_aditivo: string | null;
  data_aditivo: string;
  created_by: string;
  created_at: string;
}

export function useContratoAditivos(contratoId?: string | null) {
  return useQuery({
    queryKey: ["contrato-aditivos", contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from("contrato_aditivos" as any)
        .select("*")
        .eq("contrato_id", contratoId)
        .order("data_aditivo", { ascending: false });
      if (error) throw error;
      return (data as any[]) as ContratoAditivo[];
    },
    enabled: !!contratoId,
  });
}

export function useCreateContratoAditivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (aditivo: {
      contrato_id: string;
      valor: number;
      descricao: string;
      numero_aditivo?: string;
      data_aditivo?: string;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("contrato_aditivos" as any)
        .insert(aditivo)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contrato-aditivos", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["contratos-saldo"] });
    },
  });
}
