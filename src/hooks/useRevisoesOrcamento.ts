import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RevisaoOrcamento {
  id: string;
  os_id: string;
  valor_anterior: number;
  valor_novo: number;
  diferenca: number;
  justificativa: string;
  arquivo_justificativa: string | null;
  solicitado_por: string;
  aprovado_por: string | null;
  resposta: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  solicitante_nome?: string;
  aprovador_nome?: string;
}

export function useRevisoesOrcamento(osId?: string) {
  return useQuery({
    queryKey: ["os-revisoes-orcamento", osId],
    queryFn: async () => {
      if (!osId) return [];
      const { data, error } = await supabase
        .from("os_revisoes_orcamento" as any)
        .select("*")
        .eq("os_id", osId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const revisoes = (data as any[]) as RevisaoOrcamento[];

      // Resolve user names
      const userIds = [
        ...new Set([
          ...revisoes.map(r => r.solicitado_por),
          ...revisoes.map(r => r.aprovado_por).filter(Boolean),
        ] as string[]),
      ];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const map = new Map((profiles ?? []).map(p => [p.user_id, p.full_name]));
        revisoes.forEach(r => {
          r.solicitante_nome = map.get(r.solicitado_por) || "—";
          if (r.aprovado_por) r.aprovador_nome = map.get(r.aprovado_por) || "—";
        });
      }

      return revisoes;
    },
    enabled: !!osId,
  });
}

export function useCreateRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (revisao: {
      os_id: string;
      valor_anterior: number;
      valor_novo: number;
      justificativa: string;
      arquivo_justificativa?: string;
      solicitado_por: string;
    }) => {
      const { data, error } = await supabase
        .from("os_revisoes_orcamento" as any)
        .insert(revisao)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["os-revisoes-orcamento", vars.os_id] });
    },
  });
}

export function useApproveRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ revisaoId, aprovadoPor, resposta }: {
      revisaoId: string;
      aprovadoPor: string;
      resposta?: string;
    }) => {
      const { error } = await supabase.rpc("approve_os_revisao" as any, {
        _revisao_id: revisaoId,
        _aprovado_por: aprovadoPor,
        _resposta: resposta || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-revisoes-orcamento"] });
      qc.invalidateQueries({ queryKey: ["ordens_servico"] });
      qc.invalidateQueries({ queryKey: ["saldo-orcamentario"] });
    },
  });
}

export function useRejectRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ revisaoId, aprovadoPor, resposta }: {
      revisaoId: string;
      aprovadoPor: string;
      resposta: string;
    }) => {
      const { error } = await supabase.rpc("reject_os_revisao" as any, {
        _revisao_id: revisaoId,
        _aprovado_por: aprovadoPor,
        _resposta: resposta,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-revisoes-orcamento"] });
    },
  });
}
