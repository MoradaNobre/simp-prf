# SPEC – Especificação Funcional do SIMP (Sistema de Manutenção Predial)

**Versão:** 1.3  
**Data:** 24/02/2026  
**Responsável:** Daniel Nunes de Ávila  

---

## Histórico de Versões

- v1.3 (24/02/2026): Inclusão do perfil Suprido (preposto do cartão corporativo) como flag acumulável.
- v1.2 (24/02/2026): Destaque visual do botão "Agendar Visita" (vermelho) para maior acessibilidade.
- v1.1 (24/02/2026): Inclusão do módulo de Agenda de Visitas.
- v1.0 (16/02/2026): Versão inicial da especificação funcional.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Perfis de Usuário e Permissões](#2-perfis-de-usuário-e-permissões)
3. [Página Inicial (Landing Page)](#3-página-inicial-landing-page)
4. [Autenticação (Login)](#4-autenticação-login)
5. [Dashboard](#5-dashboard)
6. [Ordens de Serviço](#6-ordens-de-serviço)
7. [Agenda de Visitas](#7-agenda-de-visitas)
8. [Contratos](#8-contratos)
9. [Relatórios OS](#9-relatórios-os)
10. [Gestão do Orçamento](#10-gestão-do-orçamento)
11. [Gestão do Sistema](#11-gestão-do-sistema)
12. [Sobre](#12-sobre)
13. [Navegação e Layout](#13-navegação-e-layout)
14. [Regras de Negócio Transversais](#14-regras-de-negócio-transversais)

---

## 1. Visão Geral

O SIMP é um sistema web interno da Polícia Rodoviária Federal para gestão de manutenção predial. Permite o controle de ordens de serviço, contratos, orçamento e estrutura organizacional (regionais, delegacias e UOPs).

### 1.1. Hierarquia Organizacional

```
Regional (Superintendência) → Delegacia → UOP (Unidade Operacional)
```

### 1.2. Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Shadcn UI
- **Backend:** Lovable Cloud (PostgreSQL com RLS)
- **Estado:** TanStack React Query
- **Relatórios:** jsPDF (PDF), xlsx (planilhas)
- **Roteamento:** React Router DOM v6

---

## 2. Perfis de Usuário e Permissões

### 2.1. Perfis Disponíveis (7 níveis)

| Perfil | Sigla | Escopo de Dados | Tipo |
|---|---|---|---|
| Gestor Master | `gestor_master` | Acesso global irrestrito a todas as regionais | Interno |
| Gestor Nacional | `gestor_nacional` | Restrito às regionais vinculadas ao perfil | Interno |
| Gestor Regional | `gestor_regional` | Restrito à(s) regional(is) atribuída(s) | Interno |
| Fiscal de Contrato | `fiscal_contrato` | Restrito à(s) regional(is) atribuída(s) | Interno |
| Operador | `operador` | Restrito à(s) regional(is) atribuída(s) | Interno |
| Preposto | `preposto` | Restrito aos contratos vinculados | Externo |
| Terceirizado | `terceirizado` | Restrito aos contratos/OS vinculados | Externo |

**Flag Acumulável:**

| Flag | Campo | Acumulável com | Descrição |
|---|---|---|---|
| Suprido | `is_suprido` (boolean em `profiles`) | Gestor Master, Gestor Nacional, Gestor Regional, Fiscal de Contrato | Preposto do cartão corporativo. Gerenciado via checkbox no formulário de edição de usuário. Badge visual "Suprido" na listagem. |

### 2.2. Regras de Atribuição de Perfis

| Quem atribui | Pode atribuir |
|---|---|
| Gestor Master | Todos os perfis (incluindo outros Gestores Master) |
| Gestor Nacional | Todos os perfis **exceto** Gestor Master |
| Gestor Regional | Todos **exceto** Gestor Master e Gestor Nacional |
| Fiscal de Contrato | Apenas: Preposto, Operador e Terceirizado |

### 2.3. Regras de Visibilidade de Usuários

- **Gestor Master:** Vê todos os usuários, incluindo outros Gestores Master.
- **Gestor Nacional:** Vê usuários das suas regionais. **Não vê** Gestores Master.
- **Gestor Regional:** Vê usuários das suas regionais. **Não vê** Gestores Master nem Gestores Nacionais.
- **Fiscal de Contrato:** Vê usuários vinculados aos seus contratos/regionais.

### 2.4. Ações sobre Usuários

- **Inativar/Excluir usuários:** Restrito aos perfis Gestor Nacional e Gestor Master.
- **Seletores de papel:** Exibidos em ordem alfabética baseada nos nomes amigáveis em português.

### 2.5. Acesso às Páginas (Menu Lateral)

| Página | Perfis com Acesso |
|---|---|
| Dashboard | Master, Nacional, Regional, Fiscal, Operador |
| Ordens de Serviço | **Todos** os perfis |
| Agenda de Visitas | **Todos** os perfis |
| Relatórios OS | Master, Nacional, Regional, Fiscal, Preposto, Terceirizado |
| Contratos | Master, Nacional, Regional, Fiscal, Operador, Preposto |
| Gestão do Orçamento | Master, Nacional, Regional (+ Fiscal apenas leitura) |
| Gestão do Sistema | Master, Nacional, Regional |
| Sobre | **Todos** os perfis |

---

## 3. Página Inicial (Landing Page)

**Rota:** `/`

### 3.1. Estrutura

- **Navbar:** Logo + nome SIMP + toggle de tema (claro/escuro) + botão "Acessar Sistema"
- **Hero:** Banner com título, descrição e CTAs ("Entrar no Sistema" e "Ver Demonstração")
- **Funcionalidades:** Grid com 6 cards (OS, Manutenção Preventiva, Dashboard, Contratos, Controle de Acesso, Gestão de Unidades)
- **Screenshots:** 2 seções com imagens do sistema
- **Vídeo:** Player de demonstração com poster customizado
- **CTA Final:** Seção com fundo primário e botão de acesso
- **Footer:** Logo + copyright

### 3.2. Regras

- Página **pública** (sem autenticação necessária)
- Não possui filtros ou dados dinâmicos
- Links direcionam para `/login`

---

## 4. Autenticação (Login)

**Rota:** `/login`

### 4.1. Modos de Operação

| Modo | Descrição |
|---|---|
| Login | E-mail + senha → autenticação |
| Cadastro (Signup) | Nome + e-mail + senha + regional (se @prf.gov.br) |
| Esqueceu Senha | E-mail → link de recuperação por edge function customizada |
| Redefinir Senha | Nova senha (ativado via hash `type=recovery` na URL) |

### 4.2. Regras de Cadastro

- **Confirmação por e-mail:** Obrigatória (auto-confirm desabilitado).
- **Regional no cadastro:** Exibida apenas para e-mails `@prf.gov.br`. Se não selecionada, exibe aviso que o admin deve vincular manualmente.
- **Senha mínima:** 6 caracteres.
- **Botão de visibilidade:** Toggle para mostrar/ocultar senha.

### 4.3. Fluxo Pós-Login

1. Login bem-sucedido → redireciona para `/app`
2. `/app` redireciona automaticamente para `/app/dashboard` (ou primeira página acessível ao perfil)
3. Se o perfil for `terceirizado` com flag `must_change_password = true` → redireciona para `/alterar-senha`

### 4.4. Recuperação de Senha

- Utiliza edge function `send-auth-email` (não o método padrão do Supabase)
- Redireciona para `/login` com token de recuperação
- Ao detectar hash `type=recovery`, exibe formulário de nova senha

---

## 5. Dashboard

**Rota:** `/app/dashboard`

### 5.1. Acesso

- Perfis: Master, Nacional, Regional, Fiscal, Operador
- **Preposto e Terceirizado NÃO têm acesso** ao Dashboard

### 5.2. Filtros Globais

- **Regional:** Disponível para perfis com múltiplas regionais ou acesso global (Master)
- **Contrato:** Seletor de contrato para comparar performance entre prestadores

### 5.3. Aba "Ordens de Serviço" (anteriormente "Operacional")

#### KPIs Principais (4 cards)
| KPI | Descrição |
|---|---|
| OS Abertas (Backlog) | Contagem de OS com status ≠ "encerrada" |
| Urgentes | OS abertas com prioridade "urgente" |
| Concluídas (mês) | OS encerradas no mês atual |
| MTTR Médio | Tempo médio de resolução em horas |

#### Valores Financeiros (4 cards)
| KPI | Descrição |
|---|---|
| Orçamentos (total) | Soma de `valor_orcamento` de todas as OS |
| Custos Realizados | Soma da tabela `os_custos` |
| Faturado no Mês | Soma dos orçamentos das OS encerradas no mês |
| Custo por m² | Total custos / área total das UOPs |

#### OS por Etapa do Fluxo
- 7 cards mostrando quantidade de OS em cada etapa (aberta → encerrada)
- Exclui a etapa "faturamento" da contagem visual (incluída no fluxo mas sem card separado no dashboard)

#### Corretiva vs. Preventiva
- Barras percentuais comparativas
- Meta indicada: 30% corretiva / 70% preventiva

#### OS por Prioridade
- 4 barras (urgente, alta, média, baixa) com contagem e percentual sobre o backlog

#### Tempo Médio por Etapa
- 6 cards (exclui "encerrada") com tempo médio em cada etapa
- Formato dinâmico: minutos → horas → dias

### 5.4. Aba "Orçamento"

- **Acesso:** Master, Nacional, Regional, Fiscal
- **Gráfico "Cota vs Consumido por Regional":** Ordenado inicialmente por **cota (maior para menor)**
- Seletor de exercício fiscal (ano)
- Detalhes de dotação, empenhos, custos e saldo por regional
- Refresh automático a cada 30 segundos

---

## 6. Ordens de Serviço

**Rota:** `/app/ordens`

### 6.1. Acesso

- **Todos os perfis** têm acesso à listagem
- **Criação de OS:** Todos os perfis **exceto** Preposto e Terceirizado
- **Edição/Exclusão:** Master, Nacional, Regional (+ Fiscal para edição)

### 6.2. Filtros

| Filtro | Tipo | Descrição |
|---|---|---|
| Busca textual | Input | Busca por código, título ou descrição |
| Status | Select | Filtra por etapa do fluxo |
| Prioridade | Select | Filtra por nível de prioridade |
| Regional | Select | Disponível para perfis multi-regionais |
| Data início | Calendar | Filtra OS abertas a partir desta data |
| Data fim | Calendar | Filtra OS abertas até esta data |
| Botão filtros (mobile) | Toggle | Mostra/oculta painel de filtros em mobile |

### 6.3. Listagem

- **Desktop:** Tabela com colunas ordenáveis (código, título, regional, delegacia, unidade, valor, status, prioridade, data)
- **Mobile:** Cards compactos com informações resumidas
- **Total:** Exibido no rodapé (soma dos valores de orçamento)
- **Contagem:** Exibida no subtítulo da página

### 6.4. Ordenação

- Clicável em cada cabeçalho de coluna
- Ciclo: sem ordem → ascendente → descendente → sem ordem
- Ícone visual indica direção atual

### 6.5. Card Informativo por Perfil

#### Para Gestores, Fiscais e Operadores:
| Status | Ação Requerida |
|---|---|
| Aberta | Vincular contrato e encaminhar para orçamento |
| Aguardando Autorização | Aprovar ou restituir o orçamento para execução |
| Ateste | Validar a execução e autorizar emissão da NF |
| Pagamento | Verificar NF/certidões e encerrar a OS |

#### Para Preposto e Terceirizado:
| Status | Ação Requerida |
|---|---|
| Orçamento | Enviar orçamento e valor estimado |
| Execução | Realizar o serviço e registrar evidências (fotos antes/depois) |
| Faturamento | Enviar nota fiscal emitida e certidões exigidas |

### 6.6. Fluxo de Status da OS (8 etapas)

```
Aberta → Orçamento → Autorização → Execução → Ateste → Faturamento → Pagamento → Encerrada
```

#### Detalhamento por Transição

| De → Para | Quem avança | Pré-requisitos | Ações Automáticas |
|---|---|---|---|
| Aberta → Orçamento | Gestor, Fiscal | Vincular contrato (obrigatório). Opção de alterar prioridade. Contrato deve ser vigente e da mesma regional. | Notificação por e-mail |
| Orçamento → Autorização | Preposto, Terceirizado | Upload de arquivo de orçamento (Excel/PDF, obrigatório). Informar valor do orçamento (obrigatório, > 0). | Notificação por e-mail |
| Autorização → Execução | Gestor, Fiscal | **Bloqueios sequenciais:** 1) Saldo do contrato ≥ valor orçamento; 2) Valor empenhado suficiente; 3) Cota regional suficiente. Se bloqueado, fica sobrestada até recomposição do saldo. | Gera Relatório de Execução (PDF). Salva em `relatorios_execucao`. Envia PDF por e-mail via edge function `send-os-execucao`. Notificação por e-mail |
| Execução → Ateste | Preposto, Terceirizado | Upload de foto "depois" (evidência). Registro de custos (opcional). | Notificação por e-mail |
| Ateste → Faturamento | Gestor, Fiscal, Operador | Ação de aprovação denominada "Aprovar e Autorizar Emissão da Nota Fiscal". | Notificação enviada **exclusivamente** ao Preposto |
| Faturamento → Pagamento | Preposto, Terceirizado | Upload obrigatório de documentos fiscais e certidões. | Notificação por e-mail |
| Pagamento → Encerrada | Gestor, Fiscal | Verificação dos documentos enviados. Opção de assinar digitalmente (assinatura de texto). | Notificação por e-mail |

#### Restituição

- **Quem pode restituir:** Gestor, Fiscal
- **Em quais etapas:** Qualquer etapa exceto "aberta" e "encerrada"
- **Efeito:** Retorna a OS para a etapa anterior
- **Obrigatório:** Informar motivo da restituição
- **Notificação:** E-mail enviado com motivo da restituição

### 6.7. Bloqueio de Autorização (Regra de Saldo)

O sistema aplica bloqueios **estritos e sequenciais** na transição Autorização → Execução:

1. **Saldo de Contrato:** `valor_total_com_aditivos - total_custos_os_em_execução ≥ valor_orcamento`
   - Se insuficiente: Exibe alerta com link para gestão de contratos (sugestão de aditivo)
   - **Bloqueio absoluto** para todos os perfis, incluindo Gestor Nacional/Master
2. **Valor Empenhado:** Verificação do saldo empenhado da regional
3. **Cota Regional:** `cota_total - consumo_total ≥ valor_orcamento`
   - Se insuficiente: Botão para criar solicitação de crédito

### 6.8. Solicitação de Crédito (via OS)

- Disparada quando a cota regional é insuficiente para autorizar a OS
- Campos: motivo, valor solicitado, saldo atual (orçamento e contrato), referência à OS
- Aprovação pelo Gestor Nacional gera crédito automático em `orcamento_creditos`

### 6.9. Detalhes da OS (Dialog)

- Informações gerais: código, título, tipo, prioridade, status, datas
- Localização: regional, delegacia, UOP
- Contrato vinculado com saldo
- Responsáveis: solicitante, fiscal, preposto, terceirizado
- Custos registrados (com formulário para adicionar)
- Fotos: antes e depois
- Documentos: orçamento e pagamento
- Download ZIP: Compila todos os anexos e relatórios em um arquivo ZIP

### 6.10. Exclusão de OS

- **Quem pode:** Solicitante da OS, Master, Nacional, Regional
- **Regra de integridade:** Exige expurgo manual em cascata de:
  - Solicitações de crédito vinculadas
  - Custos (tabela `os_custos`)
  - Relatórios de execução e pagamento
- Confirmação via AlertDialog

### 6.11. Criação de OS (Nova OS)

- **Campos obrigatórios:** Título, tipo (corretiva/preventiva), regional, UOP
- **Campos opcionais:** Descrição, foto "antes", prioridade
- **Código automático:** Gerado pela tabela `regional_os_seq` (formato: SIGLA-ANO-SEQUENCIAL)
- **Solicitante:** Automaticamente o usuário logado

### 6.12. Edição de OS

- Permite editar: título, descrição, tipo, prioridade
- Permite vincular/alterar: UOP, contrato
- Permite definir responsáveis: fiscal, preposto/execução, encerramento
- **Quem pode editar:** Solicitante, responsável, gestores, fiscal, preposto (do contrato), terceirizado (vinculado)

---

## 7. Agenda de Visitas

**Rota:** `/app/agenda`

### 7.1. Acesso

| Página / Ação | Perfis |
|---|---|
| Página "Agenda de Visitas" (menu lateral) | Master, Nacional, Regional, Fiscal, Operador, Preposto, Terceirizado |
| Aba "Agendamentos" (detalhes da OS) | Todos os perfis com acesso à OS |
| Criar/Editar agendamento | Preposto, Terceirizado |
| Gerenciar agendamentos (qualquer) | Master, Nacional, Regional, Fiscal |
| Visualização (somente leitura) | Operador |

### 7.2. Pré-requisito

- Agendamentos de visita só podem ser criados quando a OS está no status **"Execução"**.
- A OS deve estar vinculada a um contrato.

### 7.3. Dados do Agendamento

| Campo | Tipo | Obrigatório |
|---|---|---|
| OS vinculada | Referência (`os_id`) | Sim |
| Data do agendamento | Data (datetime) | Sim |
| Descrição da atividade | Texto | Sim |
| Responsável técnico | Texto | Sim |
| Status | Select (agendada / realizada / cancelada) | Sim (padrão: "agendada") |
| Observações pós-visita | Texto | Não |

### 7.4. Visualizações

#### 7.4.1. Página Dedicada (Menu Lateral)

- **Calendário mensal** com marcadores visuais nos dias com agendamentos
- Navegação entre meses (anterior/próximo)
- Ao clicar em um dia, exibe lista dos agendamentos daquele dia
- Cada agendamento mostra: código da OS, descrição, responsável técnico, status com badge colorido
- Botão para criar novo agendamento e editar existentes

#### 7.4.2. Aba na OS (Detalhes da OS)

- Listagem de todos os agendamentos vinculados àquela OS específica
- Exibe: data, descrição, responsável, status, observações
- Botão para criar novo agendamento (visível apenas quando OS está em "Execução")
- Edição inline dos agendamentos existentes

### 7.5. Status dos Agendamentos

| Status | Descrição | Badge |
|---|---|---|
| Agendada | Visita planejada, ainda não realizada | Azul (default) |
| Realizada | Visita concluída | Verde (success) |
| Cancelada | Visita cancelada | Vermelho (destructive) |

### 7.6. Tabela de Banco de Dados

- **Tabela:** `agendamentos_visita`
- **RLS:** Políticas por perfil e regional, análogas às de `ordens_servico`

---

## 8. Contratos

**Rota:** `/app/contratos`

### 7.1. Acesso

| Ação | Perfis |
|---|---|
| Visualizar | Master, Nacional, Regional, Fiscal, Operador, Preposto |
| Criar/Editar | Master, Nacional, Regional, Fiscal |
| Excluir | Master, Nacional, Regional |
| Gerenciar Contatos | Gestores, Fiscal, Preposto (do contrato) |
| Gerenciar Aditivos | Master, Nacional, Regional, Fiscal |

### 7.2. Filtro

- **Regional:** Seletor para perfis com acesso multi-regional
- **Preposto:** Vê apenas contratos onde é o preposto vinculado

### 7.3. Listagem

- **Desktop:** Tabela com colunas: Número, Regional, Empresa, Tipo, Valor Global, Saldo, Vigência, Preposto, Status
- **Mobile:** Cards compactos
- **Status computado:** Vigente/Encerrado calculado pela data atual vs. período de vigência

### 7.4. Dados do Contrato

| Campo | Tipo | Obrigatório |
|---|---|---|
| Número | Texto | Sim |
| Empresa | Texto | Sim |
| Tipo de Serviço | Select (Manutenção Predial / Ar Condicionado) | Sim |
| Objeto | Texto | Não |
| Valor Total | Numérico | Sim |
| Data Início | Data | Sim |
| Data Fim | Data | Sim |
| Regional | Select (filtrado pelo perfil do usuário) | Sim |
| Preposto | Select (usuários com perfil Preposto) | Não |

### 7.5. Saldo do Contrato

**Fórmula:**
```
Saldo = (Valor Total + Σ Aditivos) - Σ Orçamentos de OS em Execução+
```

- **"Em Execução+"** = OS que saíram de Aberta/Orçamento/Autorização (status ≥ execução)
- View materializada: `contratos_saldo`
- Exibição: valor + percentual utilizado
- **Saldo negativo:** Destacado em vermelho

### 7.6. Aditivos Contratuais

- Cada aditivo possui: número, data, descrição, valor
- Somados ao valor total para cálculo do saldo
- Gerenciados via dialog próprio (`ContratoAditivosDialog`)

### 7.7. Contatos do Contrato

- Representantes da empresa contratada
- Campos: nome, função, e-mail, telefone, vínculo a usuário do sistema
- Usados para atribuição de responsáveis de execução na OS

### 7.8. Preposto

- Vinculado ao contrato no cadastro/edição
- E-mail sincronizado da base de usuários no momento da vinculação
- Recebe notificações automáticas de eventos do contrato
- Pode gerenciar contatos do seu contrato

### 7.9. Relatório PDF do Contrato

- Botão de download individual por contrato
- Gerado via `generateContratoReport` (jsPDF)
- Contém: dados do contrato, vigência, valores, preposto, regional

---

## 9. Relatórios OS

**Rota:** `/app/relatorios`

### 8.1. Acesso

- **Todos os perfis exceto Operador**
- Preposto e Terceirizado: veem apenas a aba "Execução"

### 8.2. Abas

#### 8.2.1. Relatórios de Execução (`RelatoriosExecucao`)

- Listagem de relatórios de execução gerados automaticamente quando uma OS avança para "Execução"
- Dados: código OS, título, contrato, valor, data de geração
- Download em PDF
- Reenvio por e-mail
- **Preposto/Terceirizado:** Veem apenas relatórios dos seus contratos

#### 8.2.2. Relatórios de Pagamento (`RelatoriosPagamento`)

- **Oculto** para Preposto e Terceirizado
- Listagem de relatórios de ateste/pagamento
- Dados: código OS, título, contrato, valor atestado, data
- Download em PDF

### 8.3. Geração de Relatórios

- **Relatório de Execução:** Gerado automaticamente na transição Autorização → Execução
- **Relatório de Pagamento:** Gerado manualmente pelo Gestor/Fiscal na fase de Pagamento/Encerramento

---

## 10. Gestão do Orçamento

**Rota:** `/app/orcamento`

### 9.1. Acesso

| Perfil | Acesso |
|---|---|
| Master, Nacional | Leitura + escrita em todas as abas |
| Regional | Leitura + escrita nas Cotas e Solicitações da sua regional |
| Fiscal | Leitura nas Cotas + criação/visualização de Solicitações |

### 9.2. Filtros Globais

- **Regional:** Seletor de regional (limitado ao perfil)
- **Exercício:** Seletor de ano fiscal

### 9.3. Aba "Portaria Orçamentária" (`GestaoLOA`)

- **Acesso:** Apenas Gestor Nacional e Master
- Gerencia a portaria orçamentária global (tabela `orcamento_loa`)
- **Tabela "Limite por Regional":** Exibida inicialmente em **ordem decrescente de valor**
- Campos: exercício, valor total, observações
- CRUD completo

### 9.4. Aba "Cotas" (Dotações por Regional)

- Card por regional com:
  - Cota Total (valor base + créditos - reduções)
  - Custos OS
  - Empenhos Manuais
  - Total Consumido
  - Saldo
  - Barra de progresso (% consumido)
- **Créditos:** Tipos: Cota Inicial, Suplementação, Redução
- **Empenhos:** Registro manual de empenhos com número e descrição
- **Exportação XLS:** Planilha com 3 abas (Resumo, Créditos, Empenhos)

### 9.5. Aba "Solicitações de Crédito" (`GestaoSolicitacoesCredito`)

- **Criação:** Regional e Fiscal podem criar solicitações
- **Tipos:** Avulsa (sem OS) ou vinculada a uma OS
- **Campos:** Motivo, valor solicitado, saldo orçamentário atual, saldo contrato
- **Resposta (Nacional/Master):**
  - Aprovação total, parcial ou recusa
  - Campo de valor aprovado (para parcial)
  - Campo de resposta/justificativa
  - Exibe saldo da Portaria Orçamentária em tempo real
- **Efeito da aprovação:** Cria automaticamente um registro em `orcamento_creditos` com tipo "suplementação"

---

## 11. Gestão do Sistema

**Rota:** `/app/gestao`

### 10.1. Acesso

| Perfil | Abas Visíveis |
|---|---|
| Master, Nacional | Usuários, Regionais, Delegacias, UOPs, Auditoria |
| Regional | Usuários, Delegacias, UOPs (da sua regional) |

### 10.2. Aba "Usuários" (`GestaoUsuarios`)

- Listagem de todos os usuários visíveis ao perfil logado
- Criação de usuário: nome, e-mail, senha, perfil, regional(is)
- Criação de usuário de contrato (Preposto/Terceirizado): via edge function `create-contract-user`
- Edição: nome, telefone, perfil, regionais, flag suprido (checkbox visível apenas para gestores e fiscais)
- Ativar/Desativar usuário
- Excluir usuário (via edge function `delete-user`)
- Regras de visibilidade e atribuição conforme [Seção 2](#2-perfis-de-usuário-e-permissões)

### 10.3. Aba "Regionais" (`GestaoRegionais`)

- **Acesso:** Apenas Master e Nacional
- **Master:** Pode criar novas regionais
- **Nacional:** Pode editar regionais vinculadas
- Campos: nome, sigla, UF
- CRUD completo

### 10.4. Aba "Delegacias" (`GestaoDelegacias`)

- Filtro por regional
- Campos: nome, município, regional vinculada
- CRUD (Master, Nacional, Regional podem gerenciar)

### 10.5. Aba "UOPs" (`GestaoUops`)

- Filtro por regional e delegacia
- Campos: nome, endereço, área (m²), latitude, longitude, delegacia vinculada
- CRUD (Master, Nacional, Regional podem gerenciar)

### 10.6. Aba "Auditoria" (`GestaoAuditLogs`)

- **Acesso:** Apenas Master e Nacional
- Listagem de logs de auditoria (tabela `audit_logs`)
- Dados: ação, tabela, registro, descrição, dados antigos/novos, timestamp, usuário
- **Exclusão de logs:** Apenas Gestor Master (`is_admin`)
- Triggers automáticos registram eventos críticos

### 10.7. Importação de Planilha

- **Acesso:** Apenas Nacional e Master
- Aceita arquivos `.csv`, `.xlsx`, `.xls`
- Importa via edge function `import-csv`
- Cria regionais, delegacias e UOPs em lote
- Feedback: quantidade de registros importados

---

## 12. Sobre

**Rota:** `/app/sobre`

- Informações do sistema (versão, desenvolvedor)
- Links para documentação técnica (`TECHNICAL_DOCS.md`)
- Política de privacidade (`PRIVACY_POLICY.md`)
- Créditos do desenvolvedor (`DEVELOPER.md`)

---

## 13. Navegação e Layout

### 12.1. Layout da Aplicação (`AppLayout`)

- **Sidebar lateral** com menu de módulos
- **Header** com trigger da sidebar (mobile) e toggle de tema
- **Área de conteúdo** com scroll independente
- **Responsivo:** Sidebar colapsável em mobile

### 12.2. Sidebar (`AppSidebar`)

- **Header:** Logo SIMP-PRF + data de build
- **Módulos:** Links filtrados por perfil do usuário
- **Footer:**
  - Informações do usuário logado (nome, perfil com badge colorido, regionais)
  - Link "Sobre"
  - Botão "Sair" (logout)

### 12.3. Cores dos Badges de Perfil

| Perfil | Cor |
|---|---|
| Gestor Master | Roxo |
| Gestor Nacional | Vermelho (destructive) |
| Gestor Regional | Padrão |
| Fiscal de Contrato | Amarelo (warning) |
| Operador | Secundário |
| Preposto | Verde (success) |
| Terceirizado | Secundário |

### 12.4. Tema

- Suporte a tema **claro** e **escuro**
- Toggle disponível no header e na landing page
- Tema padrão: claro
- Persistência: `next-themes` com atributo `class`

### 12.5. Rotas Especiais

| Rota | Função |
|---|---|
| `/definir-responsavel/:osId` | Página externa para definir responsável de OS (link por e-mail) |
| `/alterar-senha` | Alteração obrigatória de senha (terceirizados no primeiro acesso) |
| `/*` | Página 404 (NotFound) |

---

## 14. Regras de Negócio Transversais

### 13.1. Row Level Security (RLS)

- **Todas as tabelas** possuem RLS habilitado
- Políticas implementadas por perfil e escopo de dados
- Isolamento por regional em dados operacionais
- Proteção em cascata: regionais → delegacias → UOPs

### 13.2. Auditoria

- Tabela `audit_logs` registra automaticamente:
  - Ações: criação, alteração, exclusão
  - Tabela e registro afetados
  - Dados antigos e novos
  - Timestamp e identificação do responsável
- Triggers automáticos em tabelas críticas

### 13.3. Notificações por E-mail

- Enviadas via edge functions nas transições de status da OS
- Destinatários determinados pelo contexto (fiscal, preposto, terceirizado)
- Fallback: aviso visual se o envio falhar
- Edge functions:
  - `notify-os-transition`: Notificação geral de transição
  - `notify-preposto`: Notificação específica ao preposto
  - `send-os-execucao`: Envio do relatório de execução em PDF

### 13.4. Upload de Arquivos

- **Bucket:** `os-fotos` (Storage)
- **Tipos aceitos:** Imagens (fotos antes/depois), PDFs/Excel (orçamentos), documentos de pagamento
- **Nomeação:** UUID aleatório para evitar colisões
- **Públicos:** URLs públicas para exibição inline

### 13.5. Cálculo de Saldo do Contrato

```
Saldo = (valor_total + Σ aditivos.valor) - Σ os_custos.valor (de OS vinculadas em execução+)
```

- View materializada: `contratos_saldo`
- Inclui colunas: `valor_total`, `total_aditivos`, `valor_total_com_aditivos`, `total_custos`, `saldo`

### 13.6. Cálculo de Saldo Orçamentário

```
Cota Total = valor_dotacao + Σ creditos (suplementações - reduções)
Total Consumido = Σ empenhos + Σ custos_os
Saldo = Cota Total - Total Consumido
```

- View: `vw_orcamento_regional_saldo`

### 13.7. Código da OS

- Formato: `{SIGLA_REGIONAL}-{ANO}-{SEQUENCIAL_5_DIGITOS}`
- Exemplo: `SPRF/SC-2026-00042`
- Tabela de sequência: `regional_os_seq`
- Incremento automático por regional

### 13.8. Refresh Automático

- Dashboard: atualização a cada 30 segundos
- Demais páginas: invalidação de cache via TanStack React Query em mutations

### 13.9. Responsividade

- Interface adaptável para desktop e mobile
- Tabelas → Cards em telas pequenas
- Filtros colapsáveis em mobile
- Sidebar colapsável

---

*Documento de especificações elaborado para referência interna de desenvolvimento e manutenção do SIMP-PRF.*

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 22/02/2026 | Versão inicial da especificação funcional do SIMP |
| 1.1 | 24/02/2026 | Adição da seção 7 – Agenda de Visitas (calendário de manutenção vinculado a OS) |
| 1.2 | 24/02/2026 | Destaque visual do botão "Agendar Visita" (vermelho) para maior acessibilidade |
| 1.3 | 24/02/2026 | Inclusão do perfil Suprido (preposto do cartão corporativo) como flag booleana acumulável com gestores e fiscais |
