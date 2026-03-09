

## Relatório Consolidado de Faturamento por Contrato

### Objetivo
Criar um relatório PDF consolidado que agrupe todas as OS atestadas de um mesmo contrato em um período (ex: mensal), para subsidiar o envio de notas fiscais para pagamento.

### Estrutura do Relatório PDF

```text
┌─────────────────────────────────────────────┐
│  RELATÓRIO CONSOLIDADO DE FATURAMENTO       │
│  Contrato: XXX — Empresa YYY               │
│  Período: 01/03/2026 a 31/03/2026          │
├─────────────────────────────────────────────┤
│ 1. Dados do Contrato                       │
│    Número, Empresa, Vigência, Saldo         │
│ 2. Resumo do Período                       │
│    Total de OS, Valor Total Atestado        │
│ 3. Detalhamento das OS                     │
│    Tabela: Código | Título | Valor Atestado │
│           | Data Ateste | Status            │
│ 4. Totalização                             │
│    Valor total para faturamento             │
│ 5. Certificação                            │
│    Texto de ateste + data + fiscal          │
└─────────────────────────────────────────────┘
```

### Implementação

**1. Nova aba na página de Relatórios**
- Adicionar aba "Faturamento" em `src/pages/Relatorios.tsx`
- Visível apenas para perfis internos (não preposto/terceirizado)

**2. Novo componente `src/components/relatorios/RelatoriosFaturamento.tsx`**
- Filtros: Contrato (select), Período início/fim (date pickers), Regional
- Busca OS com status `ateste` ou `encerrada` no período selecionado, filtradas por `contrato_id`
- Usa dados da view `contratos_saldo` para saldo do contrato
- Preview em tabela das OS encontradas com valores atestados
- Botao "Gerar PDF Consolidado"

**3. Novo gerador PDF `src/utils/pdf/generateFaturamentoReport.ts`**
- Usa a infraestrutura existente (`pdfHelpers.ts`)
- Seções: dados do contrato, resumo financeiro, tabela de OS detalhada, totalização, certificação
- Inclui para cada OS: código, título, valor atestado, data de encerramento

**4. Dados necessários (sem alteração no banco)**
- OS: query em `ordens_servico` filtrada por `contrato_id`, status in (`ateste`, `encerrada`), e `data_encerramento` no período
- Contrato: query em `contratos` + `contratos_saldo`
- Relatórios individuais: join opcional com `relatorios_os` para pegar `valor_atestado` já registrado
- Não é necessário criar novas tabelas ou migrações

### Fluxo do Usuário
1. Acessar Relatórios → aba "Faturamento"
2. Selecionar contrato e período (mês/datas customizadas)
3. Visualizar lista de OS atestadas no período com valores
4. Clicar em "Gerar PDF" para baixar o relatório consolidado

### Arquivos a criar/editar
- **Criar**: `src/components/relatorios/RelatoriosFaturamento.tsx`
- **Criar**: `src/utils/pdf/generateFaturamentoReport.ts`
- **Editar**: `src/pages/Relatorios.tsx` (adicionar aba)

