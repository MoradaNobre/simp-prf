

## Implementação da Opção B: Coluna `motivo_bloqueio` na tabela `ordens_servico`

### Objetivo
Adicionar uma coluna `motivo_bloqueio` à tabela `ordens_servico` para registrar quando uma OS está bloqueada por insuficiência de cota orçamentária regional, permitindo filtragem e indicação visual na listagem.

### 1. Migração de banco de dados
- Adicionar coluna `motivo_bloqueio text NULL` à tabela `ordens_servico`
- Valores possíveis: `null` (sem bloqueio), `'cota_regional_insuficiente'`, `'sem_cota_cadastrada'`, `'empenho_insuficiente'`, `'saldo_contrato_insuficiente'`, `'limite_modalidade_excedido'`

### 2. Atualizar `transition_os_status` (função SQL)
- Na transição `autorizacao → execucao`, o campo `motivo_bloqueio` será limpo automaticamente (set to `null`)
- Permitir que `_updates` inclua `motivo_bloqueio` para ser gravado via `COALESCE`

### 3. Lógica no `DetalhesOSDialog.tsx`
- Quando o bloqueio é detectado na etapa de autorização, gravar o `motivo_bloqueio` na OS via `updateOS`
- Quando o bloqueio é resolvido (transição bem-sucedida para execução), limpar o campo

### 4. Indicação visual na listagem (`OrdensServico.tsx` e `OSCardMobile.tsx`)
- Exibir um badge/ícone `⚠ Aguard. Cota` ao lado do status quando `motivo_bloqueio` não é nulo e status é `autorizacao`
- Adicionar filtro opcional "Bloqueadas por cota" no filtro de status

### 5. Atualizar tipo `OrdemServico` no hook
- O campo `motivo_bloqueio` será incluído automaticamente via `Tables<"ordens_servico">` após a migração

### Arquivos a modificar
- **Migração SQL**: adicionar coluna + atualizar função `transition_os_status`
- `src/components/os/DetalhesOSDialog.tsx`: gravar motivo_bloqueio quando bloqueio detectado
- `src/pages/OrdensServico.tsx`: badge visual + filtro
- `src/components/os/OSCardMobile.tsx`: badge visual no card mobile

### Sem impacto em
- Fluxo de status (enum `os_status` não muda)
- Stepper (nenhuma etapa nova)
- Relatórios existentes

