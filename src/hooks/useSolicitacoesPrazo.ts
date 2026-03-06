import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SolicitacaoPrazo {
  id: string;
  os_id: string;
  solicitante_id: string;
  prazo_solicitado: string;
  justificativa: string;
  status: string;
  respondido_por: string | null;
  respondido_em: string | null;
  resposta: string | null;
  prazo_aprovado: string | null;
  created_at: string;
  solicitante_nome?: string;
}

export function useSolicitacoesPrazo(osId?: string) {
  return useQuery({
    queryKey: ["solicitacoes_prazo", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_prazo" as any)
        .select("*")
        .eq("os_id", osId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const items = data as any as SolicitacaoPrazo[];
      // Resolve solicitante names
      const ids = [...new Set(items.map(i => i.solicitante_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        const map = new Map((profiles ?? []).map(p => [p.user_id, p.full_name]));
        items.forEach(i => { i.solicitante_nome = map.get(i.solicitante_id) ?? ""; });
      }
      return items;
    },
    enabled: !!osId,
  });
}

export function useCreateSolicitacaoPrazo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      os_id: string;
      solicitante_id: string;
      prazo_solicitado: string;
      justificativa: string;
    }) => {
      const { error } = await supabase
        .from("solicitacoes_prazo" as any)
        .insert(data as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["solicitacoes_prazo", vars.os_id] }),
  });
}

export function useRespondSolicitacaoPrazo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      os_id,
      status,
      resposta,
      prazo_aprovado,
      respondido_por,
    }: {
      id: string;
      os_id: string;
      status: "aprovada" | "rejeitada";
      resposta: string;
      prazo_aprovado?: string;
      respondido_por: string;
    }) => {
      const { error } = await supabase
        .from("solicitacoes_prazo" as any)
        .update({
          status,
          resposta,
          prazo_aprovado: prazo_aprovado ?? null,
          respondido_por,
          respondido_em: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;

      // If approved, update the OS prazo_execucao
      if (status === "aprovada" && prazo_aprovado) {
        const { error: osErr } = await supabase
          .from("ordens_servico")
          .update({ prazo_execucao: prazo_aprovado } as any)
          .eq("id", os_id);
        if (osErr) throw osErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["solicitacoes_prazo", vars.os_id] });
      qc.invalidateQueries({ queryKey: ["ordens_servico"] });
    },
  });
}
