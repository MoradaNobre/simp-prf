import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Calcula o saldo orçamentário de uma regional no exercício corrente.
 *
 * - totalCreditos: soma dos créditos lançados (dotação inicial + suplementações - reduções)
 * - totalConsumidoOS: soma de valor_orcamento das OS aprovadas (status após 'autorizacao')
 * - totalEmpenhos: soma dos empenhos manuais lançados
 * - saldoDisponivel: totalCreditos - totalConsumidoOS - totalEmpenhos
 * - saldoNaoEmpenhado: totalCreditos - totalEmpenhos  (quanto ainda não está comprometido via empenho)
 */
export function useOrcamentoRegional(regionalId?: string | null) {
  return useQuery({
    queryKey: ["orcamento-regional-saldo", regionalId],
    queryFn: async () => {
      if (!regionalId) return null;

      const exercicio = new Date().getFullYear();

      // 1. Buscar orçamento anual da regional
      const { data: orcamento } = await supabase
        .from("orcamento_anual")
        .select("id, valor_dotacao")
        .eq("regional_id", regionalId)
        .eq("exercicio", exercicio)
        .maybeSingle();

      if (!orcamento) {
        return {
          exists: false,
          exercicio,
          totalCreditos: 0,
          totalConsumidoOS: 0,
          totalEmpenhos: 0,
          saldoDisponivel: 0,
          saldoNaoEmpenhado: 0,
        };
      }

      // 2. Buscar créditos (dotação inicial + suplementações - reduções)
      const { data: creditos } = await supabase
        .from("orcamento_creditos")
        .select("valor, tipo")
        .eq("orcamento_id", orcamento.id);

      const totalCreditos = (creditos || []).reduce((sum, c) => {
        const v = Number(c.valor);
        return c.tipo === "reducao" ? sum - v : sum + v;
      }, 0);

      // 3. Buscar empenhos manuais
      const { data: empenhos } = await supabase
        .from("orcamento_empenhos")
        .select("valor")
        .eq("orcamento_id", orcamento.id);

      const totalEmpenhos = (empenhos || []).reduce((sum, e) => sum + Number(e.valor), 0);

      // 4. Buscar OS aprovadas (status após autorização) da regional
      const statusAprovados = ["execucao", "ateste", "pagamento", "encerrada"] as const;
      const { data: osData } = await supabase
        .from("ordens_servico")
        .select("valor_orcamento, status")
        .eq("regional_id", regionalId)
        .in("status", statusAprovados);

      const totalConsumidoOS = (osData || []).reduce(
        (sum, o) => sum + (Number(o.valor_orcamento) || 0),
        0
      );

      const saldoDisponivel = totalCreditos - totalConsumidoOS - totalEmpenhos;
      const saldoNaoEmpenhado = totalCreditos - totalEmpenhos;

      return {
        exists: true,
        exercicio,
        totalCreditos,
        totalConsumidoOS,
        totalEmpenhos,
        saldoDisponivel,
        saldoNaoEmpenhado,
      };
    },
    enabled: !!regionalId,
  });
}
