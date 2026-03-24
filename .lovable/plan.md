

## Plano: Histórico de Fluxo da OS (Timeline para IMR)

### Objetivo
Adicionar uma seção visual de **timeline/histórico** dentro do diálogo de detalhes da OS, mostrando data/hora exata de cada transição de status. Esses dados já existem na tabela `audit_logs` (eventos `STATUS_CHANGE` e `restituicao`) — precisamos apenas exibi-los na UI e permitir exportação para o relatório IMR.

### O que será feito

**1. Criar componente `OSHistoricoTimeline.tsx`**
- Novo componente em `src/components/os/` que recebe o `osId` e consulta `audit_logs` filtrando por `record_id = osId`, `table_name = 'ordens_servico'`, ações `STATUS_CHANGE` e `restituicao`.
- Resolve nomes dos usuários via tabela `profiles`.
- Exibe uma timeline vertical com:
  - Ícone e cor por etapa (reutilizando o mapeamento do `OSStatusStepper`)
  - Status anterior → novo status (extraído de `old_data` e `new_data` do audit_log)
  - Data/hora formatada (`dd/mm/aaaa HH:mm`)
  - Nome do responsável pela transição
  - Tempo decorrido entre cada etapa (delta em dias/horas)
- Inclui um botão "Exportar para CSV" que gera um CSV com as colunas: Etapa De, Etapa Para, Data/Hora, Responsável, Tempo na Etapa — dados essenciais para alimentar o IMR.

**2. Integrar no `DetalhesOSDialog.tsx`**
- Adicionar a seção `OSHistoricoTimeline` após os Agendamentos e antes da seção de Restituir, com título "Histórico do Fluxo" e ícone `Clock`.
- Componente é colapsável (usando `Collapsible`) para não poluir o diálogo.

**3. Enriquecer o relatório PDF da OS**
- A seção "Histórico do Fluxo" no PDF já existe (`sectionHistorico.ts`), mas atualmente mostra dados genéricos. Enriquecer com:
  - Coluna "Tempo na Etapa" (diferença entre transições consecutivas)
  - Status de origem e destino extraídos de `old_data`/`new_data` do audit_log

### Dados já disponíveis
- `audit_logs.old_data` e `audit_logs.new_data` contêm o JSON completo da OS antes/depois da transição, incluindo `status`.
- Não é necessária nenhuma migração de banco de dados.

### Arquivos alterados
| Arquivo | Ação |
|---------|------|
| `src/components/os/OSHistoricoTimeline.tsx` | Criar (novo componente) |
| `src/components/os/DetalhesOSDialog.tsx` | Integrar o componente |
| `src/utils/pdf/sections/sectionHistorico.ts` | Adicionar coluna "Tempo na Etapa" |

