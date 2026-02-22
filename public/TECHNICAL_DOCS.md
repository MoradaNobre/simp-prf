# Documentação Técnica – SIMP (Sistema de Manutenção Predial)

## 1. Arquitetura da Solução

### 1.1. Objetivo

A aplicação SIMP foi desenvolvida como uma ferramenta interna para otimizar os processos de manutenção predial da Polícia Rodoviária Federal, proporcionando uma interface web moderna e segura para:

- **Gestão de Ordens de Serviço:** Abertura, acompanhamento e encerramento de ordens de serviço de manutenção corretiva e preventiva
- **Gestão de Contratos:** Cadastro e controle de contratos de manutenção predial, incluindo saldos e custos
- **Gestão de Ativos:** Cadastro hierárquico de unidades operacionais (regionais, delegacias, UOPs)
- **Gestão Orçamentária:** Controle de dotação anual, empenhos e créditos por regional
- **Dashboards e Relatórios:** Visualização de dados com gráficos interativos e geração de relatórios de execução e pagamento
- **Controle de Acesso:** Sistema robusto de autenticação e permissões por perfil e regional

### 1.2. Diagrama de Arquitetura Simplificado

```
┌─────────────────┐    HTTPS/TLS    ┌─────────────────────┐    API Segura    ┌─────────────────┐
│                 │ ◄──────────────► │                     │ ◄───────────────► │                 │
│ Usuário         │                  │ Aplicação Web       │                   │ Banco de Dados  │
│ (Navegador Web) │                  │ (Lovable Cloud)     │                   │ (PostgreSQL)    │
│                 │                  │                     │                   │                 │
└─────────────────┘                  └─────────────────────┘                   └─────────────────┘
```

### 1.3. Componentes Técnicos

#### **Frontend**
- **Tecnologia:** React 18, TypeScript, HTML5, CSS3
- **Build Tool:** Vite com React SWC Plugin
- **Framework de UI:** Tailwind CSS + Shadcn UI Components
- **Roteamento:** React Router DOM v6
- **Estado Global:** TanStack React Query
- **Gráficos:** Recharts para visualizações de dados
- **Relatórios:** jsPDF para geração de relatórios em PDF
- **Planilhas:** xlsx para importação/exportação de dados
- **Responsividade:** Interface adaptável para diferentes dispositivos
- **Compatibilidade:** Navegadores modernos (Chrome, Firefox, Safari, Edge)

#### **Backend**
- **Tecnologia:** Lovable Cloud (PostgreSQL com Row Level Security)
- **Framework:** PostgreSQL com Row Level Security (RLS)
- **API:** REST API automática
- **Runtime Environment:** Edge Functions (Serverless)

#### **Banco de Dados**
- **Engine:** PostgreSQL
- **Recursos Utilizados:**
  - Autenticação integrada
  - Row Level Security (RLS) em todas as tabelas
  - API REST automática
  - Funções e triggers personalizados
  - Views materializadas (ex: contratos_saldo)

#### **Hospedagem**
- **Provedor:** Lovable Cloud
- **Tipo:** Infraestrutura gerenciada em nuvem
- **Recursos:** Escaláveis conforme demanda

## 2. Segurança da Informação

### 2.1. Autenticação e Autorização

**Sistema de Autenticação:** A aplicação utiliza autenticação por e-mail e senha com controle de senha inicial obrigatória.

**Processo de Login:** Autenticação via e-mail institucional com validação de credenciais e verificação de status ativo do usuário.

**Perfis de Usuário:**
- **Gestor Nacional:** Acesso completo ao sistema, gestão de todas as regionais e usuários
- **Gestor Regional:** Gestão das unidades e dados de sua(s) regional(is)
- **Fiscal de Contrato:** Gestão de contratos e ordens de serviço
- **Operador:** Abertura e acompanhamento de ordens de serviço na sua regional
- **Preposto:** Representante da empresa contratada, acesso aos contratos vinculados
- **Terceirizado:** Acesso limitado às OS e contratos em que está envolvido

**Controle de Acesso Granular:**
- Implementação de Row Level Security (RLS) em todas as tabelas
- Políticas específicas por perfil (6 níveis de acesso)
- Isolamento de dados por regional
- Proteção contra escalação de privilégios
- Controle de usuários ativos/inativos
- Obrigatoriedade de alteração de senha no primeiro acesso

### 2.2. Segurança de Dados em Trânsito

- **Protocolo:** HTTPS com certificado SSL/TLS válido
- **Criptografia:** TLS 1.3 para toda comunicação
- **Verificação:** Certificado digital validado por autoridade certificadora reconhecida

### 2.3. Segurança de Dados em Repouso

- **Criptografia:** Dados armazenados com criptografia padrão AES-256
- **Backup:** Sistema automatizado de backup com redundância geográfica
- **Localização:** Dados armazenados em data centers com certificações de segurança internacionais
- **RLS (Row Level Security):** Políticas implementadas em todas as tabelas:
  - Isolamento por regional em tabelas de dados operacionais
  - Políticas específicas para cada perfil de usuário
  - Proteção em cascata em tabelas relacionadas (regionais → delegacias → UOPs)
  - Controle granular de operações (SELECT, INSERT, UPDATE, DELETE) por perfil
- **Proteção de Funções:** Todas as funções PostgreSQL utilizam `search_path` explícito prevenindo ataques de manipulação de schema

### 2.4. Tratamento de Dados Sensíveis

A aplicação não armazena dados classificados como sensíveis pela LGPD. Os dados processados são limitados a informações funcionais necessárias para o cumprimento das atividades institucionais da PRF.

### 2.5. Monitoramento e Auditoria

- **Logs de Acesso:** Registro automático de todas as operações de login
- **Logs de Aplicação:** Monitoramento contínuo de erros, warnings e atividades
- **Auditoria de Segurança:** Tabela dedicada `audit_logs` registrando:
  - Ações realizadas (criação, alteração, exclusão)
  - Tabela e registro afetados
  - Dados anteriores e novos para rastreabilidade completa
  - Timestamp e identificação do usuário responsável
  - Descrição da operação
- **Triggers Automáticos:** Gatilhos em nível de banco de dados para registro automático de eventos críticos
- **Retenção:** Logs mantidos indefinidamente para conformidade com políticas de segurança da PRF

## 3. Fluxo de Dados

### 3.1. Dados Coletados

A aplicação coleta os seguintes tipos de dados:

**Dados de Identificação:**
- Nome completo, E-mail institucional, Telefone de contato

**Dados Funcionais:**
- Regional de lotação do servidor
- Perfil de acesso no sistema
- Ordens de serviço (abertura, execução, ateste, pagamento, encerramento)
- Contratos de manutenção (número, empresa, valores, vigência, contatos)

- Unidades operacionais (UOPs), delegacias e regionais
- Relatórios de execução e pagamento gerados
- Dados orçamentários (dotação, empenhos, créditos)
- Fotografias de serviços (antes e depois)
- Documentos de orçamento e pagamento

**Dados Técnicos:**
- Endereço IP (para fins de segurança)
- Logs de acesso e auditoria
- Timestamps de operações

### 3.2. Finalidade da Coleta

Todos os dados coletados têm como finalidade exclusiva:
- Autenticação e controle de acesso à aplicação
- Execução das funcionalidades de gestão de manutenção predial
- Auditoria e segurança da informação
- Cumprimento das atividades institucionais da PRF

### 3.3. Compartilhamento de Dados

**Princípio Geral:** Os dados não são compartilhados com terceiros para fins comerciais, publicitários ou não relacionados à finalidade institucional.

**Operadores de Dados:**
- **Lovable Cloud (Hospedagem e Banco de Dados):** Acesso limitado aos dados necessários para manutenção da infraestrutura, atuando como operador de dados

**Contratos de Operação:** Os provedores operam sob contratos que garantem confidencialidade e uso adequado dos dados conforme LGPD.

## 4. Modelo de Dados

### 4.1. Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados de perfil dos usuários (nome, telefone, regional, status ativo) |
| `user_roles` | Papéis/perfis de acesso dos usuários |
| `user_regionais` | Associação de usuários a regionais |
| `regionais` | Cadastro das superintendências regionais (nome, sigla, UF) |
| `delegacias` | Cadastro de delegacias vinculadas às regionais |
| `uops` | Unidades Operacionais Policiais (endereço, área, coordenadas) |

| `ordens_servico` | Ordens de serviço de manutenção (título, descrição, status, prioridade, tipo) |
| `os_custos` | Custos associados às ordens de serviço |
| `contratos` | Contratos de manutenção predial |
| `contrato_contatos` | Contatos vinculados aos contratos |
| `contrato_aditivos` | Aditivos contratuais (valor, descrição, número, data) |
| `contratos_saldo` | View com saldo disponível dos contratos (inclui aditivos) |
| `solicitacoes_credito` | Solicitações de crédito suplementar por regional |
| `orcamento_anual` | Dotação orçamentária anual por regional |
| `orcamento_empenhos` | Empenhos realizados |
| `orcamento_creditos` | Créditos orçamentários |
| `relatorios_execucao` | Relatórios de execução de OS |
| `relatorios_os` | Relatórios de ateste/pagamento de OS |
| `planos_manutencao` | Planos de manutenção preventiva |
| `audit_logs` | Logs de auditoria do sistema |
| `regional_os_seq` | Sequencial de numeração de OS por regional |

### 4.2. Fluxo de Status das Ordens de Serviço

```
Aberta → Orçamento → Autorização → Execução → Ateste → Faturamento → Pagamento → Encerrada
```

- **Faturamento (nova etapa):** Após o ateste do serviço, a OS aguarda a emissão da nota fiscal e a juntada das certidões exigidas pelo preposto/terceirizado antes de avançar para pagamento.

Cada transição de status é registrada com timestamp e identificação do responsável.

## 5. Especificações Técnicas Complementares

### 5.1. Performance

- **Tempo de Resposta:**
  - Consultas ao banco de dados: < 1 segundo (com RLS otimizado)
  - Geração de relatórios PDF: < 5 segundos
  - Renderização de dashboards: < 2 segundos
- **Concorrência:** Suporte para múltiplos usuários simultâneos (escalável)
- **Disponibilidade:** Alta disponibilidade garantida pela infraestrutura em nuvem
- **Otimizações:**
  - Lazy loading de componentes
  - Cache de queries com TanStack React Query
  - Índices em colunas críticas do banco de dados
  - Compressão de assets via Vite

### 5.2. Manutenção

- **Atualizações:**
  - Deploy contínuo via Git com integração Lovable
  - Rollback automático em caso de falhas
  - Versionamento semântico (SemVer)
- **Monitoramento:**
  - Métricas de banco de dados
  - Logs de aplicação em tempo real
  - Alertas automáticos para erros críticos
- **Suporte:** Desenvolvedor interno (Daniel Nunes de Ávila) com conhecimento completo da stack
- **Documentação:** Código documentado + documentação técnica atualizada

### 5.3. Conformidade

- **LGPD:** Aplicação desenvolvida em conformidade com a Lei Geral de Proteção de Dados
- **Padrões de Segurança:** Seguimento das boas práticas de desenvolvimento seguro
- **Políticas Internas:** Alinhamento com as diretrizes de TI da PRF

## 6. Funcionalidades Principais

### 6.1. Módulo de Ordens de Serviço
- Abertura de OS corretivas e preventivas
- Fluxo completo de status (aberta → encerrada) com 7 etapas
- Atribuição de responsáveis (fiscal, preposto, terceirizado)
- Upload de fotos (antes/depois) e documentos de orçamento
- Registro de custos (peças, mão de obra)
- Assinatura digital para ateste
- Controle de prioridade (baixa, média, alta, urgente)
- Notificações por e-mail nas transições de status
- **Bloqueio estrito por saldo de contrato:** Quando o saldo do contrato vinculado é insuficiente, a autorização da OS é sobrestada para todos os perfis (incluindo Gestor Nacional), permanecendo bloqueada até a recomposição do saldo via aditivo contratual
- **Bloqueio por saldo orçamentário regional:** O Gestor Nacional possui permissão exclusiva para ignorar o bloqueio por falta de orçamento regional e prosseguir com a autorização mediante aviso visual
- **Link direto para gestão de contratos:** Quando identificado impedimento contratual, a interface apresenta botão de acesso direto à página de contratos para registro de aditivo
- **Solicitação de Crédito Suplementar:** Gestores Regionais e Fiscais podem submeter solicitações quando o saldo orçamentário é insuficiente

### 6.2. Módulo de Contratos
- Cadastro de contratos com dados completos (número, empresa, valor, vigência)
- Gestão de contatos vinculados ao contrato
- Vinculação de preposto e terceirizados
- Controle de saldo (valor total + aditivos – custos das OS em execução)
- Geração de relatórios por contrato
- **Aditivos contratuais:** Registro de termos aditivos com valor, número, data e descrição, recompondo o saldo do contrato em tempo real (tabela `contrato_aditivos`)
- **Gestão de terceirizados pelo Preposto:** O perfil Preposto pode adicionar e gerenciar terceirizados vinculados aos seus contratos, com criação automática de conta de acesso via Edge Function

### 6.3. Módulo de Gestão
- Cadastro de regionais, delegacias e UOPs
- Gestão de usuários (criação, perfis, ativação/desativação)

- Logs de auditoria do sistema
- **Solicitações de Crédito Suplementar:** Aba centralizada para análise e decisão pelo Gestor Nacional sobre solicitações de crédito submetidas por Gestores Regionais e Fiscais

### 6.4. Módulo Orçamentário
- Cadastro de dotação orçamentária anual por regional
- Registro de empenhos e créditos
- Visualização de saldo disponível
- Controle por exercício financeiro
- **Cálculo de saldo:** Considera dotação inicial + créditos − consumo real das OS (contabilizado a partir da etapa de Execução); empenhos são registros informativos e não reduzem o saldo disponível

### 6.5. Módulo de Relatórios
- Relatórios de execução de OS
- Relatórios de pagamento/ateste
- Exportação em PDF
- Envio por e-mail aos destinatários

### 6.6. Dashboard
- Visão geral de OS por status e prioridade
- Gráficos de execução orçamentária
- Filtros por regional
- Indicadores de desempenho

## 7. Edge Functions (Backend Functions)

| Função | Descrição |
|--------|-----------|
| `create-contract-user` | Criação de usuário vinculado a contrato (preposto/terceirizado) |
| `delete-user` | Exclusão de usuário do sistema |
| `import-csv` | Importação de dados via arquivo CSV |
| `list-user-emails` | Listagem de e-mails de usuários |
| `notify-os-transition` | Notificação por e-mail nas transições de status de OS |
| `notify-preposto` | Notificação ao preposto sobre eventos do contrato |
| `send-os-execucao` | Envio de relatório de execução por e-mail |

---

*Documento técnico elaborado conforme padrões de documentação da Polícia Rodoviária Federal.*

**Versão:** 1.1
**Data:** 16/02/2026
**Última Atualização:** 20/02/2026
**Responsável:** Daniel Nunes de Ávila

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 16/02/2026 | Versão inicial da documentação técnica do SIMP |
| 1.1 | 20/02/2026 | Adição de aditivos contratuais, bloqueio estrito de autorização por saldo de contrato, solicitações de crédito suplementar, gestão de terceirizados pelo preposto |
