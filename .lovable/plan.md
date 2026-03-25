

# Correção: Saldo Empenhado Não Deduz OS Já Autorizadas

## Problema Identificado

A view `vw_orcamento_regional_saldo` calcula `total_empenhos` como a **soma bruta** de todos os empenhos registrados. O campo nunca é reduzido pelo consumo de OS autorizadas/em execução.

Na tela de autorização, a validação compara:
```
empenhoInsuficiente = totalEmpenhado < valorOS
```

Isso compara o **total empenhado bruto** (R$ 150.000) com o valor da OS atual (R$ 5.000), sem considerar que outras OS já consomem parte desse empenho. Resultado: o sistema sempre mostra R$ 150.000 empenhado, independentemente de quantas OS já foram autorizadas.

## Solução

### 1. Alterar a view `vw_orcamento_regional_saldo`

Adicionar uma coluna calculada `saldo_empenhado` que representa o empenho disponível:

```
saldo_empenhado = total_empenhos - total_consumo_os
```

A view será recriada com essa nova coluna.

### 2. Atualizar o hook `useSaldoOrcamentario.ts`

Adicionar `saldo_empenhado` à interface `SaldoOrcamentario`.

### 3. Corrigir a validação em `DetalhesOSDialog.tsx`

Trocar a comparação de:
```typescript
const empenhoInsuficiente = totalEmpenhado < valorOS;
```
Para:
```typescript
const saldoEmpenhado = saldoOrcamento?.saldo_empenhado ?? 0;
const empenhoInsuficiente = saldoEmpenhado < valorOS;
```

Atualizar também os textos exibidos para mostrar "Saldo empenhado disponível" em vez do total bruto.

### 4. Criar trigger de validação no banco (segurança adicional)

Criar uma função `check_os_empenho_limit()` que valida no banco se o saldo empenhado disponível é suficiente antes de permitir a transição para `execucao`. Isso garante proteção contra race conditions, mesmo que o frontend seja burlado.

### Arquivos Afetados

- **Migration SQL**: Recriar a view com `saldo_empenhado`; criar trigger de validação
- `src/hooks/useSaldoOrcamentario.ts`: Adicionar campo `saldo_empenhado`
- `src/components/os/DetalhesOSDialog.tsx`: Usar `saldo_empenhado` na validação e exibição
- `src/components/dashboard/DashboardOrcamento.tsx`: Exibir saldo empenhado disponível (opcional)

