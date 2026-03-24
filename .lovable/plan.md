

## Plano: Relatório IMR (Instrumento de Medição de Resultado)

### Objetivo
Criar uma nova aba "IMR" na página de Relatórios, com motor de regras automáticas que detecta falhas nas OS e calcula o score IMR, gerando PDF completo para instrução processual.

### Arquitetura

```text
┌─ Relatórios (página) ──────────────────────────────┐
│  [Execução] [Pagamento] [Faturamento] [IMR]        │
│                                                     │
│  ┌─ RelatoriosIMR.tsx ───────────────────────────┐  │
│  │ Filtros: Regional, Contrato, Período (mês)    │  │
│  │                                               │  │
│  │ ┌─ Resumo Executivo ───────────────────────┐  │  │
│  │ │ IMR: 8.5 | Meta: ≥9.0 | Situação: ...   │  │  │
│  │ └─────────────────────────────────────────────│  │
│  │ ┌─ Consolidação OS ────────────────────────┐  │  │
│  │ │ Tabela com OS do período                 │  │  │
│  │ └─────────────────────────────────────────────│  │
│  │ ┌─ Matriz de Ocorrências ──────────────────┐  │  │
│  │ │ Falhas detectadas automaticamente        │  │  │
│  │ │ + Ocorrências manuais do fiscal          │  │  │
│  │ └─────────────────────────────────────────────│  │
│  │ ┌─ Cálculo IMR + Impacto Financeiro ───────┐  │  │
│  │ │ Fórmula: 10 - Σ pontos                  │  │  │
│  │ └─────────────────────────────────────────────│  │
│  │ ┌─ Análise Qualitativa ────────────────────┐  │  │
│  │ │ Textarea do fiscal                       │  │  │
│  │ └─────────────────────────────────────────────│  │
│  │ ┌─ Contraditório ─────────────────────────┐   │  │
│  │ │ Status, prazo, decisão final            │   │  │
│  │ └─────────────────────────────────────────────│  │
│  │                                               │  │
│  │ [Gerar PDF IMR]                               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### O que será feito

**1. Novo componente `RelatoriosIMR.tsx`** (~500 linhas)

Interface com filtros (contrato + período mensal) que busca todas as OS do contrato no período e aplica o **motor de regras automáticas**:

| Regra | Condição | Item IMR | Pontos |
|-------|----------|----------|--------|
| Atraso no prazo de execução | `data_encerramento > prazo_execucao` | Item 8/9 | 1.0-2.0 |
| Valor realizado zero em OS encerrada | `totalCustos = 0 AND status = encerrada` | Item 1/20 | 1.0-3.0 |
| Desvio orçamentário > 10% | `abs(custos - orcamento) / orcamento > 0.10` | Item 1 | 0.5-1.0 |
| GUT alto + demora excessiva | `gut_score ≥ 27 AND dias_aberta > 30` | Item 19 | 2.0 |
| Prazo de orçamento excedido | `data_orcamento > prazo_orcamento` | Item 8 | 1.0 |

O fiscal pode adicionar ocorrências manuais e editar a análise qualitativa. Seções de contraditório e decisão final com campos editáveis.

**Cálculo:** `IMR = 10 - Σ(pontos_perdidos)`
- `≥ 9.0` → Conforme
- `7.0–8.9` → Conduta Adversa
- `5.0–6.9` → Com Penalização
- `< 5.0` → Crítico

**Impacto financeiro:** Percentual de retenção baseado na faixa do IMR aplicado sobre o valor total atestado no período.

**2. Gerador PDF `generateIMRReport.ts`**

PDF com as 11 seções do template:
1. Identificação da Avaliação
2. Resumo Executivo
3. Consolidação das OS
4. Matriz de Ocorrências
5. Regras de Detecção Aplicadas
6. Cálculo do IMR
7. Impacto Financeiro
8. Análise Qualitativa
9. Contraditório
10. Decisão Final
11. Anexos (referências)

Reutiliza os helpers de `pdfHelpers.ts` (addSection, addLine, tabelas, numeração de páginas).

**3. Integração na página Relatórios**

Adicionar aba "IMR" em `src/pages/Relatorios.tsx` (visível apenas para perfis internos, mesmo controle do Faturamento).

**4. Tabela `relatorios_imr`** (migração)

Persiste os relatórios IMR gerados para histórico e rastreabilidade:

```sql
CREATE TABLE public.relatorios_imr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL,
  regional_id uuid,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  imr_score numeric NOT NULL DEFAULT 10,
  situacao text NOT NULL DEFAULT 'conforme',
  total_ocorrencias integer DEFAULT 0,
  total_pontos_perdidos numeric DEFAULT 0,
  valor_fatura numeric DEFAULT 0,
  valor_glosa numeric DEFAULT 0,
  percentual_retencao numeric DEFAULT 0,
  analise_qualitativa text,
  contraditorio_status text DEFAULT 'sem_manifestacao',
  contraditorio_data_envio date,
  decisao_final text,
  imr_pos_reconsideracao numeric,
  penalidade_aplicada text,
  encaminhamento text DEFAULT 'arquivamento',
  ocorrencias jsonb DEFAULT '[]',
  os_consolidadas jsonb DEFAULT '[]',
  dados_json jsonb DEFAULT '{}',
  gerado_por_id uuid NOT NULL,
  gerado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.relatorios_imr ENABLE ROW LEVEL SECURITY;
```

RLS: mesmas políticas dos demais relatórios (gestores, fiscais, nacionais podem ver/criar por regional).

### Dados consumidos (já existentes)
- `ordens_servico`: status, datas, valores, prioridade, prazos
- `os_custos`: valor realizado por OS
- `chamados`: gut_score para regra de risco estrutural
- `audit_logs`: timestamps de transição para cálculo de atrasos
- `contratos` + `contratos_saldo`: dados contratuais
- `relatorios_os`: valor_atestado

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/relatorios/RelatoriosIMR.tsx` | Criar |
| `src/utils/pdf/generateIMRReport.ts` | Criar |
| `src/pages/Relatorios.tsx` | Adicionar aba IMR |
| Migração SQL | Criar tabela `relatorios_imr` |

