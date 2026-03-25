import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SaldoOrcamentario {
  orcamento_id: string;
  regional_id: string;
  exercicio: number;
  valor_dotacao: number;
  total_creditos: number;
  total_empenhos: number;
  total_consumo_os: number;
  saldo_disponivel: number;
  credito_nao_empenhado: number;
  saldo_empenhado: number;
}

export function useSaldoOrcamentarioRegional(regionalId?: string | null, exercicio?: number) {
  const ano = exercicio ?? new Date().getFullYear();
  return useQuery({
    queryKey: ["saldo-orcamentario", regionalId, ano],
    queryFn: async () => {
      if (!regionalId) return null;
      const { data, error } = await (supabase as any)
        .from("vw_orcamento_regional_saldo")
        .select("*")
        .eq("regional_id", regionalId)
        .eq("exercicio", ano)
        .maybeSingle();
      if (error) throw error;
      return (data as SaldoOrcamentario) ?? null;
    },
    enabled: !!regionalId,
  });
}

export interface SolicitacaoCredito {
  id: string;
  regional_id: string;
  os_id: string | null;
  solicitante_id: string;
  valor_os: number;
  valor_solicitado: number;
  valor_aprovado: number | null;
  saldo_contrato: number;
  saldo_orcamento: number;
  motivo: string;
  status: string;
  resposta: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  created_at: string;
}

export function useSolicitacoesCredito(status?: string) {
  return useQuery({
    queryKey: ["solicitacoes-credito", status],
    queryFn: async () => {
      let q = supabase
        .from("solicitacoes_credito" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as SolicitacaoCredito[];
    },
  });
}

export function useCreateSolicitacaoCredito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sol: {
      regional_id: string;
      os_id: string | null;
      solicitante_id: string;
      valor_os: number;
      saldo_contrato: number;
      saldo_orcamento: number;
      valor_solicitado?: number;
      motivo: string;
    }) => {
      const { data, error } = await supabase
        .from("solicitacoes_credito" as any)
        .insert(sol)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes-credito"] }),
  });
}

export function useRespondSolicitacaoCredito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resposta, respondido_por, valor_aprovado }: {
      id: string;
      status: "aprovada" | "recusada";
      resposta: string;
      respondido_por: string;
      valor_aprovado?: number;
    }) => {
      const updateData: any = {
        status,
        resposta,
        respondido_por,
        respondido_em: new Date().toISOString(),
      };
      if (valor_aprovado !== undefined) {
        updateData.valor_aprovado = valor_aprovado;
      }
      const { data, error } = await supabase
        .from("solicitacoes_credito" as any)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // When approved, create a credit entry in orcamento_creditos
      if (status === "aprovada") {
        const sol = data as any;
        const valorCredito = valor_aprovado ?? sol.valor_solicitado ?? 0;
        if (valorCredito > 0) {
          const currentYear = new Date().getFullYear();
          // Find the orcamento_anual for this regional + year
          const { data: orcamento, error: orcError } = await supabase
            .from("orcamento_anual" as any)
            .select("id")
            .eq("regional_id", sol.regional_id)
            .eq("exercicio", currentYear)
            .maybeSingle();
          if (orcError) throw orcError;
          if (orcamento) {
            const { error: credError } = await supabase
              .from("orcamento_creditos" as any)
              .insert({
                orcamento_id: (orcamento as any).id,
                valor: valorCredito,
                tipo: "suplementar",
                descricao: `Crédito suplementar aprovado - Solicitação ${sol.os_id ? "vinculada a OS" : "avulsa"}`,
                created_by: respondido_por,
                data_credito: new Date().toISOString().split("T")[0],
              });
            if (credError) throw credError;
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes-credito"] });
      qc.invalidateQueries({ queryKey: ["saldo-orcamentario"] });
      qc.invalidateQueries({ queryKey: ["orcamento-creditos"] });
      qc.invalidateQueries({ queryKey: ["orcamento-anual"] });
    },
  });
}

export function useDeleteSolicitacaoCredito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("solicitacoes_credito" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes-credito"] }),
  });
}
