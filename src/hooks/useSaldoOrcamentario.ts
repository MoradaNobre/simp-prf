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
  os_id: string;
  solicitante_id: string;
  valor_os: number;
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
      os_id: string;
      solicitante_id: string;
      valor_os: number;
      saldo_contrato: number;
      saldo_orcamento: number;
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
    mutationFn: async ({ id, status, resposta, respondido_por }: {
      id: string;
      status: "aprovada" | "recusada";
      resposta: string;
      respondido_por: string;
    }) => {
      const { data, error } = await supabase
        .from("solicitacoes_credito" as any)
        .update({
          status,
          resposta,
          respondido_por,
          respondido_em: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes-credito"] }),
  });
}
