# 📘 PRD – Product Requirements Document

## SIMP-PRF – Sistema Integrado de Manutenção Predial

**Versão:** 1.7  
**Data:** 24/03/2026  
**Classificação:** Documento Institucional

---

## 1. Visão Geral do Produto

### 1.1 Propósito

O SIMP-PRF é um sistema corporativo destinado à gestão integrada da manutenção predial no âmbito da Polícia Rodoviária Federal, contemplando:

- Registro e triagem de chamados de manutenção com análise de prioridade por Matriz GUT
- Controle de contratos de manutenção vinculados a regionais
- Gestão orçamentária descentralizada por regional (dotação, cotas, empenhos)
- Formalização e rastreabilidade completa de Ordens de Serviço (OS) em 8 etapas
- Controle preventivo da execução da despesa com bloqueios automáticos em 4 níveis
- Monitoramento gerencial por indicadores em tempo real
- Gestão de ativos prediais e planos de manutenção preventiva (PMOC)

O fluxo operacional do sistema segue a sequência: **Chamado → Análise GUT → Agrupamento → Ordem de Serviço**, garantindo que toda demanda de manutenção seja formalmente registrada, priorizada e rastreada antes de gerar uma OS.

O sistema atua como ferramenta de governança administrativa e mitigação de riscos orçamentários, garantindo segregação de funções e trilha de auditoria completa.

### 1.2 Público-Alvo

O sistema atende a hierarquia organizacional da PRF, desde a administração central até as Unidades Operacionais (UOPs), incluindo gestores, fiscais, operadores e prestadores de serviço terceirizados.

---

## 2. Objetivos de Negócio

### 2.1 Objetivos Estratégicos

| # | Objetivo |
|---|---|
| OE-01 | Impedir execução contratual sem cobertura financeira em três níveis (contrato, empenho, cota). |
| OE-02 | Garantir rastreabilidade completa do ciclo da despesa, da abertura ao encerramento. |
| OE-03 | Assegurar segregação de funções no fluxo operacional (solicitante ≠ autorizador ≠ executor ≠ atestador). |
| OE-04 | Reduzir riscos de sobrecontratação e extrapolação de saldo contratual e orçamentário. |
| OE-05 | Padronizar o fluxo de manutenção predial em todas as 29 regionais da PRF. |
| OE-06 | Disponibilizar indicadores gerenciais em tempo real para tomada de decisão. |
| OE-07 | Facilitar auditorias internas e externas com registro automático de todas as ações. |

### 2.2 Problemas que o Sistema Resolve

| Situação Anterior | Com o SIMP-PRF |
|---|---|
| Controle manual de saldo contratual em planilhas | Cálculo automático com view materializada `contratos_saldo` |
| Falta de visibilidade consolidada por regional | Dashboard com KPIs e gráficos atualizados a cada 30 segundos |
| Risco de execução sem dotação orçamentária suficiente | Bloqueios sequenciais automáticos em 4 níveis (cota → contrato → limite modalidade → empenho) |
| Fragilidade na trilha de auditoria | Registro automático via triggers em `audit_logs` com dados antigos e novos |
| Fluxos não padronizados entre regionais | Fluxo único nacional de 8 etapas com requisitos obrigatórios por transição |
| Comunicação informal sobre andamento de OS | Notificações automáticas por e-mail em cada transição de status |
| Dificuldade de controle de acesso por perfil | Row Level Security (RLS) com isolamento por regional e perfil |

---

## 3. Escopo do Produto

### 3.1 Incluído no Escopo

| Módulo | Descrição |
|---|---|
| Autenticação e Autorização | Login por e-mail/senha, 7 perfis hierárquicos, RLS por regional |
| Gestão de Usuários | Criação, edição, inativação e exclusão com regras hierárquicas |
| Gestão de Contratos | Cadastro, aditivos, contatos, vinculação de preposto, cálculo de saldo |
| Chamados | Registro de demandas de manutenção com análise GUT, agrupamento e vinculação a OS |
| Ordens de Serviço | Ciclo completo de 8 etapas com bloqueios, uploads e notificações |
| Controle Orçamentário | Portaria orçamentária (LOA), cotas regionais, créditos, empenhos |
| Solicitações de Crédito | Criação avulsa ou vinculada a OS, aprovação total ou parcial |
| Relatórios | Relatório de Execução (automático) e de Pagamento (manual), ambos em PDF |
| Notificações por E-mail | Envio automático por transição com destinatários contextuais |
| Auditoria | Registro completo de ações com dados antigos/novos em `audit_logs` |
| Dashboard Gerencial | KPIs de OS e orçamento com atualização automática |
| Gestão de Ativos | Cadastro hierárquico de unidades (Regional > Delegacia > UOP) e planos de manutenção preventiva |
| Gestão do Sistema | Regionais, delegacias, UOPs, importação em lote (CSV/XLSX) |

### 3.2 Fora do Escopo

| Item | Justificativa |
|---|---|
| Processo licitatório | Gerido por sistemas próprios (Comprasnet, PGC) |
| Liquidação contábil no SIAFI | Integração com sistema federal externo não prevista nesta versão |
| Pagamento bancário | Executado via sistemas financeiros da administração federal |
| Integração automática com sistemas federais externos | Prevista para versões futuras |
| Gestão de patrimônio móvel | Foco exclusivo em manutenção predial |

---

## 4. Perfis de Usuário

O sistema possui **7 perfis de acesso** organizados hierarquicamente:

| Perfil | Escopo Territorial | Escopo Funcional | Visibilidade |
|---|---|---|---|
| **Gestor Master** | Global (todas as regionais) | Acesso irrestrito a todas as funcionalidades | Visível apenas para outros Gestores Master |
| **Gestor Nacional** | Regionais vinculadas | Acesso administrativo completo nas suas regionais | Visível para Master e Nacional |
| **Gestor Regional** | Regional(is) atribuída(s) | Gestão operacional completa na regional | Não visualiza Master nem Nacional |
| **Fiscal de Contrato** | Regional(is) atribuída(s) | Fiscalização de contratos e OS | Visualiza usuários dos seus contratos/regionais |
| **Operador** | Regional(is) atribuída(s) | Operações básicas de OS | Acesso operacional limitado |
| **Preposto** | Contratos vinculados | Gestão operacional do contrato | Visualiza apenas seus contratos |
| **Terceirizado** | Contratos e OS vinculados | Execução técnica de OS | Acesso mínimo, restrito às OS atribuídas |

**Flag Acumulável:**

| Flag | Campo | Acumulável com | Descrição |
|---|---|---|---|
| **Suprido** | `is_suprido` (boolean em `profiles`) | Gestor Master, Gestor Nacional, Gestor Regional, Fiscal de Contrato | Agente do Cartão Corporativo. Gerenciado via checkbox na edição de usuário (visível apenas para gestores e fiscais). Badge visual "Suprido" na listagem de usuários e na sidebar. |

**Comportamento do Suprido:**

- Em contratos do tipo **Cartão Corporativo**, o campo "Preposto" é substituído por "Suprido", filtrando automaticamente apenas usuários com a flag `is_suprido = true`.
- O Suprido possui permissão especial para avançar as etapas de **Orçamento** e **Execução** em OS vinculadas a contratos Cartão Corporativo, atuando como o responsável interno pela demanda.
- Para contratos Cartão Corporativo, o fluxo da OS **pula as etapas de Faturamento e Pagamento**, indo diretamente do Ateste para Encerrada.

### 4.1 Hierarquia de Atribuição de Perfis

| Perfil do Atribuidor | Pode Atribuir |
|---|---|
| Gestor Master | Todos os perfis, incluindo Gestor Master |
| Gestor Nacional | Todos, exceto Gestor Master |
| Gestor Regional | Todos, exceto Gestor Master e Gestor Nacional |
| Fiscal de Contrato | Apenas Preposto, Operador e Terceirizado |

---

## 5. Regras de Uso do Sistema

### 5.1 Regras Gerais

- Todo usuário deve possuir e-mail confirmado antes do primeiro acesso.
- Todas as ações de criação, alteração e exclusão são registradas em trilha de auditoria automática.
- O sistema aplica isolamento de dados por regional via Row Level Security (RLS).
- Nenhuma OS pode pular etapas no fluxo de 8 fases.
- Toda restituição (retorno à etapa anterior) exige justificativa obrigatória.
- Terceirizados com flag `must_change_password` são redirecionados para alteração obrigatória de senha.

### 5.2 Regras de Acesso

- Perfis são limitados territorialmente às regionais atribuídas (exceto Gestor Master).
- Gestor Nacional **não** recebe notificações operacionais de transição de OS.
- Exclusão e inativação de usuários são restritas aos perfis Gestor Nacional e Gestor Master.
- A visibilidade de perfis administrativos superiores é ocultada hierarquicamente.

### 5.3 Regras de Controle Financeiro

A autorização de execução de uma OS está sujeita a **quatro bloqueios sequenciais e estritos**:

| Nível | Verificação | Consequência se Insuficiente |
|---|---|---|
| **1º – Cota Regional** | (Dotação + Créditos − Reduções) − Consumo ≥ Valor do Orçamento | Bloqueio absoluto (inclui Gestor Master). Opção de criar solicitação de crédito. |
| **2º – Saldo de Contrato** | (Valor Total + Aditivos) − Custos OS ≥ Valor do Orçamento | Bloqueio com sugestão de aditivo. Exceção: "Contrata + Brasil" ignora este bloqueio. |
| **3º – Limite de Modalidade** | Consumo da modalidade (regional/ano) + OS atual ≤ Teto cadastrado | Apenas para Cartão Corporativo e Contrata + Brasil. Painel com Teto/Consumido/Disponível. |
| **4º – Valor Empenhado** | Saldo empenhado da regional ≥ Valor do Orçamento | Bloqueio com alerta visual. |

> A OS permanece **sobrestada** até a recomposição do saldo em qualquer nível de bloqueio.

---

## 6. Fluxos Funcionais Principais

### 6.0 Ciclo de Vida do Chamado (Pré-OS)

O chamado é a etapa inicial do fluxo de manutenção, servindo como porta de entrada formal para todas as demandas prediais antes da geração de uma Ordem de Serviço.

#### 6.0.1 Fluxo de Status

```
Aberto → Analisado (GUT) → Vinculado (a uma OS)
```

#### 6.0.2 Detalhamento das Etapas

| Etapa | Descrição | Responsável |
|---|---|---|
| **Aberto** | Chamado registrado com tipo de demanda, descrição, local, prioridade e foto opcional. | Operador, Fiscal, Gestor Regional, Gestor Nacional, Gestor Master |
| **Analisado** | Avaliação da criticidade via Matriz GUT (Gravidade × Urgência × Tendência), atribuindo scores de 1 a 5 para cada dimensão. Score final = G × U × T (1 a 125). | Gestor Regional, Fiscal, Gestor Nacional, Gestor Master |
| **Vinculado** | Chamado(s) agrupados em uma Ordem de Serviço. A prioridade da OS é derivada do maior score GUT entre os chamados selecionados. | Gestor Regional, Fiscal, Gestor Nacional, Gestor Master |

#### 6.0.3 Derivação de Prioridade da OS

| Score GUT | Prioridade da OS |
|---|---|
| ≥ 64 | Urgente |
| ≥ 27 | Alta |
| ≥ 8 | Média |
| < 8 | Baixa |

#### 6.0.4 Regras do Chamado

- Um chamado só pode ser vinculado a uma OS após análise GUT.
- Múltiplos chamados podem ser agrupados em uma única OS.
- Após vinculação, o chamado recebe status "Vinculado" e referência à OS gerada.
- O cancelamento de chamados exige motivo obrigatório e é restrito a: Operador (apenas seus próprios chamados), Fiscal e Gestores.
- A exclusão definitiva é restrita ao Gestor Master.

---

### 6.1 Ciclo de Vida da Ordem de Serviço (8 Etapas)

```
Aberta → Orçamento → Autorização → Execução → Ateste → Faturamento → Pagamento → Encerrada
```

Cada transição:
- Registra o responsável pela ação
- Registra timestamp automático
- Pode exigir upload obrigatório de documentos
- Dispara notificações por e-mail aos stakeholders pertinentes

### 6.2 Requisitos Documentais por Etapa

| Transição | Documento Obrigatório | Responsável |
|---|---|---|
| Aberta → Orçamento | Vinculação de contrato vigente | Gestor/Fiscal/Operador |
| Orçamento → Autorização | Arquivo de orçamento (Excel/PDF) + valor > 0 | Preposto/Terceirizado |
| Autorização → Execução | Verificação de saldo (4 bloqueios: cota, contrato, limite modalidade, empenho) | Gestor/Fiscal |
| Execução → Ateste | Foto "depois" (evidência) | Preposto/Terceirizado |
| Ateste → Faturamento | Aprovação do ateste | Gestor/Fiscal/Operador |
| Faturamento → Pagamento | Documentos fiscais e certidões | Preposto/Terceirizado |
| Pagamento → Encerrada | Assinatura digital (opcional) | Gestor/Fiscal |

### 6.3 Ações Automáticas

| Evento | Ação Automática |
|---|---|
| Transição para Execução | Geração de Relatório de Execução em PDF + envio por e-mail |
| Qualquer transição de status | Notificação por e-mail aos stakeholders pertinentes |
| Transição para Faturamento | Notificação exclusiva ao Preposto |

### 6.4 Restituição

- Permitida para Gestor e Fiscal em qualquer etapa, exceto "Aberta" e "Encerrada".
- Motivo da restituição é campo obrigatório.
- Gera notificação por e-mail com o motivo informado.

---

## 7. Requisitos Funcionais

### 7.1 Autenticação (RF-AUTH)

| ID | Requisito |
|---|---|
| RF-AUTH-01 | Login por e-mail e senha com mínimo de 6 caracteres. |
| RF-AUTH-02 | Confirmação obrigatória de e-mail (auto-confirm desabilitado). |
| RF-AUTH-03 | Redirecionamento automático pós-login para `/app/dashboard` ou primeira página acessível. |
| RF-AUTH-04 | Alteração obrigatória de senha para terceirizados com flag `must_change_password`. |
| RF-AUTH-05 | Recuperação de senha via edge function customizada (`send-auth-email`). |
| RF-AUTH-06 | Exibição condicional do campo de regional para domínio `@prf.gov.br`. |

### 7.2 Gestão de Usuários (RF-USR)

| ID | Requisito |
|---|---|
| RF-USR-01 | Criação de usuários internos com nome, e-mail, senha, perfil e regional(is). |
| RF-USR-02 | Criação de usuários de contrato (Preposto/Terceirizado) via edge function `create-contract-user`. |
| RF-USR-03 | Atribuição de perfil conforme hierarquia de permissões do atribuidor. |
| RF-USR-04 | Inativação e exclusão controlada, restrita a perfis Gestor Nacional e Gestor Master. |
| RF-USR-05 | Visualização de usuários limitada conforme escopo territorial e hierárquico. |
| RF-USR-06 | Exclusão de usuários via edge function `delete-user`. |
| RF-USR-07 | Gestão da flag "Suprido" via checkbox no formulário de edição (visível apenas para perfis gestor e fiscal). |
| RF-USR-08 | Badge visual "Suprido" na listagem de usuários e na sidebar do sistema. |

### 7.3 Gestão de Contratos (RF-CTR)

| ID | Requisito |
|---|---|
| RF-CTR-01 | Cadastro e edição de contratos com número, empresa, objeto, tipo de serviço, valor, vigência e regional. |
| RF-CTR-02 | Cálculo automático de saldo: (Valor Total + Σ Aditivos) − Σ Custos OS com status ≥ Execução. |
| RF-CTR-03 | Gerenciamento de aditivos contratuais (valor somado ao total). |
| RF-CTR-04 | Destaque visual em vermelho para saldo negativo. |
| RF-CTR-05 | Filtragem de contratos por regional e vínculo do usuário. |
| RF-CTR-06 | Status automático (Vigente/Encerrado) calculado pela data atual vs. vigência. |
| RF-CTR-07 | Vinculação de Preposto com sincronização de e-mail da base de usuários. |
| RF-CTR-08 | Gerenciamento de contatos do contrato. |
| RF-CTR-09 | Duplicação de contratos do tipo "Cartão Corporativo" com formulário pré-preenchido. |
| RF-CTR-10 | Em contratos "Cartão Corporativo", o campo "Preposto" é substituído por "Suprido" com filtro automático de usuários `is_suprido = true`. |

### 7.4 Gestão de Ordens de Serviço (RF-OS)

| ID | Requisito |
|---|---|
| RF-OS-01 | Criação de OS por todos os perfis, exceto Preposto e Terceirizado. |
| RF-OS-02 | Geração automática de código no formato `{SIGLA_REGIONAL}-{ANO}-{SEQUENCIAL_5_DIGITOS}`. |
| RF-OS-03 | Campos obrigatórios: Título, Tipo (corretiva/preventiva), Regional, UOP. |
| RF-OS-04 | Vinculação obrigatória a contrato vigente da mesma regional na transição para Orçamento. |
| RF-OS-05 | Bloqueio de execução por insuficiência de saldo (4 níveis: cota regional, contrato, limite de modalidade, empenho). |
| RF-OS-06 | Restituição com justificativa obrigatória por Gestor/Fiscal. |
| RF-OS-07 | Geração automática de Relatório de Execução em PDF na transição para Execução. |
| RF-OS-08 | Exclusão com expurgo em cascata de registros vinculados (custos, relatórios, solicitações de crédito). |
| RF-OS-09 | Edição permitida para Master, Nacional, Regional e Fiscal. |
| RF-OS-10 | Exclusão permitida para solicitante da OS, Master, Nacional e Regional. |

### 7.5 Gestão Orçamentária (RF-ORC)

| ID | Requisito |
|---|---|
| RF-ORC-01 | Gestão de Portaria Orçamentária (LOA) restrita a Gestor Nacional e Gestor Master. |
| RF-ORC-02 | Gestão de dotação por regional com créditos (suplementação, redução) e empenhos. |
| RF-ORC-03 | Cálculo automático de Cota Total: Dotação + Σ Créditos (suplementações − reduções). |
| RF-ORC-04 | Cálculo automático de Consumo: Σ Empenhos + Σ Custos OS. |
| RF-ORC-05 | Cálculo automático de Saldo: Cota Total − Total Consumido. |
| RF-ORC-06 | Solicitação de crédito avulsa ou vinculada a OS. |
| RF-ORC-07 | Aprovação total ou parcial de solicitações com criação automática de suplementação. |
| RF-ORC-08 | Resposta a solicitações restrita a Gestor Nacional e Gestor Master. |
| RF-ORC-09 | Fiscal com acesso somente leitura às cotas, podendo criar e visualizar solicitações de crédito. |
| RF-ORC-10 | Gestão de limites de modalidade (Cartão Corporativo, Contrata + Brasil) por regional e ano, com edição inline. |

### 7.6 Notificações (RF-NOT)

| ID | Requisito |
|---|---|
| RF-NOT-01 | Envio automático de notificação por e-mail em cada transição de status de OS. |
| RF-NOT-02 | Destinatários definidos conforme a etapa de destino (ver Seção 6.3). |
| RF-NOT-03 | Gestor Nacional não recebe notificações de transição. |
| RF-NOT-04 | Inclusão de botão de acesso direto ao sistema em cada e-mail. |
| RF-NOT-05 | Exibição de alerta visual (fallback) em caso de falha no envio. |
| RF-NOT-06 | E-mails enviados via domínio `simp.estudioai.site`. |

### 7.7 Auditoria (RF-AUD)

| ID | Requisito |
|---|---|
| RF-AUD-01 | Registro automático de criação, alteração e exclusão via triggers. |
| RF-AUD-02 | Armazenamento de dados antigos e novos em cada registro de alteração. |
| RF-AUD-03 | Manutenção de logs de forma persistente e indefinida. |
| RF-AUD-04 | Isolamento de visualização por regional via RLS. |
| RF-AUD-05 | Exclusão de logs restrita ao Gestor Master. |
| RF-AUD-06 | Importação de estrutura em lote via edge function `import-csv`. |

### 7.8 Relatórios (RF-REL)

| ID | Requisito |
|---|---|
| RF-REL-01 | Relatório de Execução gerado automaticamente na transição Autorização → Execução. |
| RF-REL-02 | Relatório de Pagamento gerado manualmente por Gestor/Fiscal na fase de Pagamento/Encerramento. |
| RF-REL-03 | Ambos os relatórios em formato PDF. |
| RF-REL-04 | Preposto e Terceirizado visualizam apenas a aba "Execução" e somente de seus contratos. |
| RF-REL-05 | Aba "Pagamento" ocultada para Preposto e Terceirizado. |
| RF-REL-06 | Relatórios de OS (Execução e Pagamento) incluem seção "Chamados Vinculados" com código, tipo de demanda, local, solicitante e Matriz GUT. |
| RF-REL-07 | Relatório de Contrato inclui resumo de chamados (total e OS originadas) e coluna "CH" (quantidade de chamados) na tabela de OS. |

### 7.10 Chamados (RF-CHM)

| ID | Requisito |
|---|---|
| RF-CHM-01 | Registro de chamados de manutenção por todos os perfis, exceto Preposto e Terceirizado. |
| RF-CHM-02 | Cada chamado possui: tipo de demanda, descrição, local do serviço, prioridade, regional, delegacia, UOP e foto opcional. |
| RF-CHM-03 | Código do chamado gerado automaticamente pelo banco de dados. |
| RF-CHM-04 | Análise de chamados com Matriz GUT (Gravidade × Urgência × Tendência) por Gestores e Fiscais. |
| RF-CHM-05 | Agrupamento de chamados analisados em Ordem de Serviço com vinculação automática. |
| RF-CHM-06 | Prioridade da OS gerada é derivada do maior score GUT entre os chamados agrupados. |
| RF-CHM-07 | Fluxo de status do chamado: Aberto → Analisado → Vinculado (a uma OS). |
| RF-CHM-08 | Cancelamento de chamados com motivo obrigatório. |
| RF-CHM-09 | Tipos de demanda: Hidráulico, Elétrico, Iluminação, Incêndio, Estrutura, Rede Lógica, Elevadores, Ar Condicionado, Instalações Diversas. |
| RF-CHM-10 | Seleção múltipla de chamados para geração de OS consolidada. |
| RF-CHM-11 | Ordenação por score GUT (toggle) para priorização visual. |

### 7.9 Dashboard (RF-DASH)

| ID | Requisito |
|---|---|
| RF-DASH-01 | Filtro global de Regional e Contrato. |
| RF-DASH-02 | KPIs: OS Abertas (Backlog), Urgentes, Concluídas no mês, MTTR Médio. |
| RF-DASH-03 | Backlog = todas as OS com status ≠ "encerrada". |
| RF-DASH-04 | Custo por m² = Total de Custos ÷ Área Total das UOPs. |
| RF-DASH-05 | Meta indicativa: 30% corretiva / 70% preventiva. |
| RF-DASH-06 | Aba Orçamento com gráfico "Cota vs Consumido" ordenado por cota decrescente. |
| RF-DASH-07 | Atualização automática a cada 30 segundos. |
| RF-DASH-08 | Acessível a Master, Nacional, Regional, Fiscal e Operador (não a Preposto/Terceirizado). |

---

## 8. Matriz de Acesso por Página

| Página | Master | Nacional | Regional | Fiscal | Operador | Preposto | Terceirizado |
|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Chamados | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ordens de Serviço | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Relatórios OS | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* | ✅* |
| Contratos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ❌ |
| Gestão do Orçamento | ✅ | ✅ | ✅ | ✅** | ❌ | ❌ | ❌ |
| Gestão do Sistema | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sobre | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> *\* Acesso restrito a dados de seus contratos*  
> *\*\* Somente leitura*

---

## 9. Indicadores de Sucesso (KPIs do Produto)

| # | Indicador | Descrição |
|---|---|---|
| KPI-01 | Taxa de execução sem saldo | % de OS que avançaram para Execução sem cobertura financeira (meta: 0%) |
| KPI-02 | Índice de sobrecarga orçamentária | Nº de regionais com saldo negativo no período |
| KPI-03 | Tempo médio de tramitação (MTTR) | Tempo médio entre abertura e encerramento de OS |
| KPI-04 | Proporção corretiva/preventiva | Percentual de OS corretivas vs. preventivas (meta: 30%/70%) |
| KPI-05 | Índice de OS sobrestadas | % de OS bloqueadas por insuficiência de saldo |
| KPI-06 | Cobertura de auditoria | % de ações registradas em trilha de auditoria (meta: 100%) |
| KPI-07 | Custo por m² | Total de custos ÷ área total das UOPs atendidas |

---

## 10. Requisitos Não Funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-01 | Performance | Atualização automática do dashboard a cada 30 segundos. |
| RNF-02 | Responsividade | Interface responsiva: tabelas convertidas em cards em telas pequenas. |
| RNF-03 | Acessibilidade Visual | Suporte a tema claro e escuro com persistência de preferência. |
| RNF-04 | Escalabilidade | Performance adequada para 29 regionais simultâneas. |
| RNF-05 | Geração de Documentos | Relatórios em formato PDF gerados automaticamente. |
| RNF-06 | Armazenamento | Upload de arquivos com identificação por UUID para evitar colisões. |
| RNF-07 | Cache | Invalidação de cache via TanStack React Query em mutations. |
| RNF-08 | Tema Padrão | Tema claro como padrão do sistema. |

---

## 11. Restrições Técnicas

| # | Restrição | Implementação |
|---|---|---|
| RT-01 | Segurança de dados | Row Level Security (RLS) habilitado em todas as tabelas com isolamento por regional. |
| RT-02 | Cálculos de saldo | Views materializadas: `contratos_saldo` e `vw_orcamento_regional_saldo`. |
| RT-03 | Lógica de backend | Edge functions para: envio de e-mail, criação de usuários, importação CSV. |
| RT-04 | Armazenamento de arquivos | Bucket `os-fotos` com URLs públicas para exibição inline. |
| RT-05 | Auditoria | Triggers automáticos em tabelas sensíveis para registro em `audit_logs`. |
| RT-06 | Sequenciamento de OS | Tabela `regional_os_seq` com incremento por regional. |
| RT-07 | Domínio de e-mail | Notificações enviadas via domínio `simp.estudioai.site`. |

---

## 12. Riscos Identificados

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R-01 | Dependência de atualização correta de views materializadas | Saldo desatualizado pode liberar execução indevida | Refresh periódico e validação na transição |
| R-02 | Exposição de documentos via URLs públicas no bucket | Acesso não autorizado a documentos fiscais | Avaliar migração para URLs assinadas em versão futura |
| R-03 | Crescimento indefinido de logs de auditoria | Degradação de performance em consultas | Implementar política de arquivamento em versão futura |
| R-04 | Complexidade crescente do modelo de permissão | Dificuldade de manutenção e teste de 7 perfis | Documentação atualizada (REGRAS_NEGOCIO.md) e testes |
| R-05 | Falha no envio de notificações por e-mail | Stakeholders não informados sobre transições | Fallback visual + retry em edge functions |
| R-06 | Concorrência em transições de OS | Dois usuários avançando a mesma OS simultaneamente | **Mitigado**: função `transition_os_status` com `SELECT … FOR UPDATE` valida atomicamente o status esperado antes de permitir a transição. |

---

## 13. Documentação de Referência

| Documento | Localização | Descrição |
|---|---|---|
| SPEC.md | Raiz do projeto | Especificação técnica completa de funcionalidades |
| REGRAS_NEGOCIO.md | Raiz do projeto | Catálogo formal com 197 regras numeradas (RN-001 a RN-197) |
| TECHNICAL_DOCS.md | Raiz e `/public` | Documentação técnica do sistema (v1.1) |
| PRIVACY_POLICY.md | Raiz e `/public` | Política de privacidade |
| DEVELOPER.md | Raiz do projeto | Créditos e informações do desenvolvedor |

---

## 14. Conclusão

O SIMP-PRF é um sistema de **governança administrativa** com foco em:

- **Controle preventivo da despesa** — bloqueios automáticos em 4 níveis impedem irregularidades
- **Rastreabilidade completa** — trilha de auditoria automática em todas as ações
- **Segregação de funções** — 7 perfis com escopos territoriais e funcionais distintos
- **Transparência gerencial** — dashboard com indicadores em tempo real

Não se trata apenas de ferramenta operacional, mas de **mecanismo institucional de controle interno estruturado**, alinhado às boas práticas de governança da administração pública federal.

---

*PRD – Product Requirements Document — SIMP-PRF*  
*Versão 1.6 — 06/03/2026*

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 22/02/2026 | Versão inicial do PRD |
| 1.1 | 24/02/2026 | Atualização para 4 níveis de bloqueio na autorização, duplicação de contratos, limites de modalidade, 179 regras de negócio |
| 1.2 | 24/02/2026 | Inclusão do perfil Suprido (flag acumulável), comportamento em contratos Cartão Corporativo, fluxo abreviado (Ateste → Encerrada) |
| 1.3 | 26/02/2026 | Inclusão do módulo de Chamados (RF-CHM), reestruturação dos relatórios PDF com seção de chamados vinculados, 197 regras de negócio |
| 1.4 | 26/02/2026 | Inclusão do fluxo funcional de Chamados (seção 6.0) como etapa pré-OS, atualização do Propósito com sequência Chamado → OS |
| 1.5 | 28/02/2026 | Aceite obrigatório de Termos de Uso e Política de Privacidade (dialog modal bloqueante com `accepted_terms_at`), novo tipo de demanda "Usina Solar" (10 tipos), 202 regras de negócio |
| 1.6 | 06/03/2026 | Prazos obrigatórios de orçamento e execução nas transições de OS. Agenda unificada (visitas + prazos). 210 regras de negócio |
