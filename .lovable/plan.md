

# Revisão de Orçamento de OS durante Execução

## Problema
O valor orçado de uma OS pode mudar durante a execução (para mais ou para menos). Atualmente, o `valor_orcamento` é definido na fase de Orçamento e nunca mais é alterado. Se aumentar, o sistema precisa revalidar os limites (saldo empenhado, cota regional, saldo contrato, limite de modalidade) antes de aceitar o complemento.

## Solução Proposta

### Conceito: "Aditivo de OS" (Revisão Orçamentária)

Criar um fluxo de **revisão do valor orçamentário** da OS durante a fase de execução, com revalidação automática dos limites.

### 1. Nova tabela `os_revisoes_orcamento`

Registra o histórico de revisões para auditoria:

```
- id (uuid, PK)
- os_id (uuid, FK → ordens_servico)
- valor_anterior (numeric)
- valor_novo (numeric)
- diferenca (numeric, computed: valor_novo - valor_anterior)
- justificativa (text, obrigatório)
- arquivo_justificativa (text, path no storage)
- solicitado_por (uuid)
- aprovado_por (uuid, nullable)
- status (text: 'pendente' | 'aprovado' | 'recusado')
- created_at, updated_at
```

### 2. Fluxo de Revisão

```text
Preposto/Fiscal solicita revisão (informa novo valor + justificativa)
  ↓
Sistema calcula diferença (positiva = aumento, negativa = redução)
  ↓
Se AUMENTO:
  → Valida saldo empenhado disponível para o delta
  → Valida saldo contrato para o delta
  → Valida cota regional para o delta
  → Valida limite de modalidade para o delta
  → Se qualquer limite insuficiente: revisão fica "pendente" com motivo
  → Se tudo OK: gestor/fiscal aprova, valor_orcamento é atualizado
Se REDUÇÃO:
  → Aprovação automática ou manual (conforme preferência)
  → valor_orcamento é atualizado, saldo "liberado" automaticamente
```

### 3. Trigger de validação no banco

Criar função `check_os_revisao_limits()` que, ao aprovar uma revisão com aumento, verifica se os saldos comportam o novo valor total.

### 4. Atualização do `valor_orcamento`

Ao aprovar a revisão, o `valor_orcamento` da OS é atualizado atomicamente. A view `vw_orcamento_regional_saldo` já usa o `valor_orcamento` atual, então o saldo recalcula automaticamente.

### 5. UI — Seção "Revisão Orçamentária" na fase de Execução

No `DetalhesOSDialog.tsx`, quando `os.status === "execucao"`:
- Botão "Solicitar Revisão de Orçamento" (preposto, fiscal, gestor)
- Formulário: novo valor, justificativa, upload de documento
- Exibição do delta e validação em tempo real dos limites
- Se aumento e limites insuficientes: mostra bloqueios (mesma lógica da autorização)
- Lista de revisões anteriores com status

### 6. Aprovação pelo Gestor/Fiscal

- Gestor/fiscal vê revisões pendentes na OS
- Pode aprovar (sistema atualiza `valor_orcamento`) ou recusar (com justificativa)

### Arquivos Afetados

- **Migration SQL**: Criar tabela `os_revisoes_orcamento` + RLS + função de aprovação com validação
- `src/hooks/useOrdensServico.ts`: Adicionar hooks para revisões (query, create, approve/reject)
- `src/components/os/DetalhesOSDialog.tsx`: Seção de revisão orçamentária na fase de execução
- `src/hooks/useSaldoOrcamentario.ts`: Sem mudanças (view já recalcula com valor_orcamento atualizado)

### Benefícios

- **Auditoria completa**: cada alteração de valor é registrada com justificativa
- **Validação de limites**: aumentos são bloqueados se não houver saldo suficiente
- **Consistência**: trigger no banco garante integridade mesmo com race conditions
- **Reduções liberando saldo**: ao reduzir o valor, o saldo fica automaticamente disponível para outras OS

