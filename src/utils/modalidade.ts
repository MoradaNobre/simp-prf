/**
 * Utility functions for contract modality-specific OS flow logic.
 *
 * - cartao_corporativo: skips "faturamento" and "pagamento" steps
 * - contrata_brasil: full 8-step flow but bypasses budget blocking on authorization
 * - default (manutencao_predial, manutencao_ar_condicionado): standard 8-step flow with full budget blocking
 */

const fullStatusFlow = [
  "aberta", "orcamento", "autorizacao", "execucao", "ateste", "faturamento", "pagamento", "encerrada",
] as const;

export type TipoServico = string;

/** Returns the status flow for a given tipo_servico */
export function getStatusFlowForTipo(tipoServico: TipoServico | undefined | null): string[] {
  if (tipoServico === "cartao_corporativo") {
    // Skip faturamento and pagamento
    return ["aberta", "orcamento", "autorizacao", "execucao", "ateste", "encerrada"];
  }
  // contrata_brasil and all others use the full flow
  return [...fullStatusFlow];
}

/** Whether the given tipo_servico bypasses contract balance blocking on authorization */
export function bypassesContractBalance(tipoServico: TipoServico | undefined | null): boolean {
  return tipoServico === "contrata_brasil";
}

/** Whether the given tipo_servico bypasses budget (orçamento regional) blocking */
export function bypassesBudgetBlocking(tipoServico: TipoServico | undefined | null): boolean {
  return tipoServico === "contrata_brasil" || tipoServico === "cartao_corporativo";
}

/** Human-readable label for tipo_servico */
export function tipoServicoLabel(tipoServico: TipoServico | undefined | null): string {
  switch (tipoServico) {
    case "manutencao_predial": return "Manutenção Predial";
    case "manutencao_ar_condicionado": return "Manutenção de Ar Condicionado";
    case "cartao_corporativo": return "Cartão Corporativo";
    case "contrata_brasil": return "Contrata + Brasil";
    default: return tipoServico || "—";
  }
}
