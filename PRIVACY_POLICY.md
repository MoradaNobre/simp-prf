# Política de Privacidade – SIMP

## Introdução e Definições

Esta Política de Privacidade descreve como a aplicação SIMP (Sistema de Manutenção Predial), desenvolvida para uso interno da Polícia Rodoviária Federal (PRF), coleta, utiliza, armazena e protege os dados pessoais dos usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

### Definições Importantes:

- **Aplicação SIMP:** Sistema interno de gestão de manutenção predial desenvolvido para servidores da PRF
- **Controlador:** Polícia Rodoviária Federal
- **Operador:** Daniel Nunes de Ávila (desenvolvedor) e prestadores de serviços de infraestrutura
- **Titular de Dados:** Servidor da PRF ou prestador de serviço terceirizado que utiliza a aplicação
- **Dados Pessoais:** Informações relacionadas a pessoa natural identificada ou identificável

## 1. Quais Dados São Coletados e Para Qual Finalidade?

### 1.1. Dados Coletados

A aplicação SIMP coleta os seguintes dados pessoais:

**Dados de Identificação e Autenticação:**
- Nome completo
- E-mail institucional (@prf.gov.br) ou e-mail corporativo de empresas contratadas
- Telefone de contato

**Dados Funcionais e Operacionais:**
- Regional de lotação do servidor
- Perfil de acesso (gestor nacional, gestor regional, fiscal de contrato, operador, preposto, terceirizado)
- Flag "Suprido" (preposto do cartão corporativo) — indicador booleano acumulável com perfis de gestor e fiscal
- Registros de chamados de manutenção (tipo de demanda, descrição, local, prioridade, foto, análise GUT)
- Registros de ordens de serviço (abertura, execução, encerramento)
- Dados de limites de modalidade por regional e ano
- Dados de contratos de manutenção (número, empresa, valores, vigência)
- Informações de contatos de contratos (nome, função, e-mail, telefone)
- Dados de unidades operacionais (UOPs), delegacias e regionais
- Dados de equipamentos e seus históricos de manutenção
- Agendamentos de visitas técnicas (data, descrição, responsável técnico, status, observações)
- Relatórios de execução e pagamento gerados
- Registros de orçamento anual, empenhos e créditos
- Fotografias de antes e depois de serviços executados
- Documentos de orçamento e pagamento anexados
- Histórico de operações realizadas na aplicação

**Dados Técnicos:**
- Endereço IP e informações de acesso
- Logs de auditoria da aplicação
- Timestamps de operações realizadas

### 1.2. Finalidades do Tratamento

Os dados pessoais são tratados exclusivamente para as seguintes finalidades:

a) **Autenticação e Controle de Acesso:** Verificar a identidade do usuário e garantir acesso autorizado conforme perfil e regional de lotação

b) **Execução das Funcionalidades:**
   - Gestão de ordens de serviço de manutenção predial (corretiva e preventiva)
   - Cadastro e gestão de contratos de manutenção
   - Controle de equipamentos e infraestrutura predial
   - Geração de relatórios técnicos e gerenciais
   - Gestão orçamentária (dotação, empenhos, créditos)
   - Visualização de dados através de dashboards
   - Acompanhamento do fluxo de manutenção predial

c) **Segurança da Informação:** Monitoramento contínuo, auditoria de alterações críticas (mudanças de perfil, transições de status de OS), prevenção de acessos não autorizados e escalação de privilégios

d) **Cumprimento de Obrigação Legal:** Atendimento às normas internas da PRF e legislação aplicável à gestão patrimonial e contratual

e) **Exercício Regular de Direitos:** Execução das atribuições institucionais da PRF relacionadas à manutenção e conservação predial

### 1.3. Base Legal

O tratamento dos dados pessoais fundamenta-se nas seguintes bases legais da LGPD:
- **Art. 7º, III:** Execução de políticas públicas pela administração pública
- **Art. 7º, II:** Cumprimento de obrigação legal ou regulatória pelo controlador
- **Art. 7º, VI:** Exercício regular de direitos em processo judicial, administrativo ou arbitral

## 2. Como os Dados São Armazenados e Protegidos?

### 2.1. Armazenamento

- **Localização:** Dados armazenados em infraestrutura de nuvem segura
- **Criptografia:** Aplicação de criptografia AES-256 para dados em repouso
- **Backup:** Sistema automatizado de backup com redundância geográfica

### 2.2. Medidas de Segurança Técnicas

- **Transmissão:** Criptografia TLS 1.3 para todos os dados em trânsito
- **Acesso:**
  - Autenticação por e-mail e senha com controle de senha inicial
  - Controle de acesso baseado em perfis (gestor nacional, gestor regional, fiscal de contrato, operador, preposto, terceirizado)
  - Isolamento por regional
- **Isolamento:**
  - Row Level Security (RLS) implementado em todas as tabelas
  - Prevenção de escalação de privilégios no nível de banco de dados
  - Políticas específicas por perfil e regional
- **Proteção de Código:**
  - Funções de banco de dados com search_path explícito
  - Prevenção de ataques de manipulação de schema
- **Monitoramento:**
  - Logs de auditoria automáticos via triggers
  - Tabela dedicada para eventos de segurança críticos
  - Rastreamento de alterações de perfil e transições de status
  - Monitoramento contínuo de atividades

### 2.3. Medidas de Segurança Organizacionais

- **Treinamento:** Conscientização sobre proteção de dados para usuários
- **Políticas:** Estabelecimento de políticas internas de segurança da informação
- **Responsabilidades:** Definição clara de papéis e responsabilidades no tratamento de dados
- **Incidentes:** Procedimentos para resposta a incidentes de segurança

## 3. Com Quem os Seus Dados Podem Ser Compartilhados?

### 3.1. Princípio Geral

Os dados pessoais **não são compartilhados com terceiros** para finalidades comerciais, publicitárias ou não relacionadas às atividades institucionais da PRF.

### 3.2. Compartilhamento Autorizado

Os dados podem ser compartilhados nas seguintes situações:

**a) Operadores de Dados (Prestadores de Serviços):**
- **Lovable:** Provedor de hospedagem e infraestrutura da aplicação (acesso limitado para manutenção)
- **Provedor de banco de dados:** Processamento conforme instruções contratuais

**b) Requisições Legais:**
- Quando exigido por autoridade competente mediante ordem judicial
- Para cumprimento de obrigação legal ou regulatória

**c) Dentro da PRF:**
- Compartilhamento com outros servidores quando necessário para cumprimento das finalidades institucionais
- Compartilhamento com empresas contratadas (prepostos e terceirizados) limitado aos dados necessários à execução dos serviços de manutenção
- Sempre limitado ao princípio da necessidade e proporcionalidade

### 3.3. Contratos de Operação

Todos os operadores de dados estão submetidos a contratos que garantem:
- Confidencialidade dos dados pessoais
- Uso exclusivo conforme instruções da PRF
- Implementação de medidas de segurança adequadas
- Notificação de incidentes de segurança

## 4. Por Quanto Tempo os Dados São Armazenados?

### 4.1. Período de Retenção

Os dados pessoais são mantidos pelo tempo necessário para:
- Cumprimento das finalidades para as quais foram coletados
- Atendimento às obrigações legais e regulamentares
- Exercício de direitos em processos administrativos ou judiciais

### 4.2. Critérios de Retenção

- **Dados de Acesso e Autenticação:** Mantidos por 5 anos para fins de auditoria e conformidade
- **Dados de Ordens de Serviço:** Mantidos indefinidamente enquanto o imóvel pertencer à PRF, para histórico de manutenção predial
- **Dados de Agendamentos de Visitas:** Mantidos pelo mesmo período da OS vinculada
- **Dados de Contratos:** Mantidos pelo prazo de vigência do contrato, acrescido de 5 anos para fins de auditoria
- **Dados de Orçamento:** Mantidos indefinidamente para histórico financeiro e prestação de contas
- **Logs de Auditoria:** Mantidos indefinidamente para rastreabilidade de eventos críticos
- **Imagens e Documentos:** Mantidos enquanto a ordem de serviço ou contrato associado estiver ativo no sistema

### 4.3. Eliminação

Após o período de retenção, os dados são eliminados de forma segura, garantindo sua irrecuperabilidade.

## 5. Quais São os Seus Direitos Como Titular de Dados?

Conforme a LGPD, você possui os seguintes direitos:

### 5.1. Direitos Garantidos

**a) Confirmação e Acesso (Art. 18, I e II):**
- Confirmar se seus dados pessoais são tratados
- Acessar seus dados pessoais

**b) Correção (Art. 18, III):**
- Solicitar correção de dados incompletos, inexatos ou desatualizados

**c) Anonimização, Bloqueio ou Eliminação (Art. 18, IV):**
- Solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos

**d) Portabilidade (Art. 18, V):**
- Solicitar portabilidade dos dados a outro fornecedor (quando aplicável)

**e) Eliminação (Art. 18, VI):**
- Solicitar eliminação dos dados tratados com base no consentimento

**f) Informação (Art. 18, VII):**
- Obter informação sobre entidades públicas e privadas com as quais a PRF compartilhou seus dados

**g) Informação sobre Não Consentimento (Art. 18, VIII):**
- Ser informado sobre a possibilidade de não fornecer consentimento e suas consequências

### 5.2. Exercício dos Direitos

Para exercer seus direitos, entre em contato através dos canais oficiais:
- **E-mail do Desenvolvedor/DPO:** daniel.avila@prf.gov.br
- **Telefone:** (81) 9.9507-3100
- **Canal Oficial PRF:** Através da chefia imediata ou ouvidoria da PRF

**Prazo de Resposta:** As solicitações serão respondidas em até 15 (quinze) dias, conforme Art. 19 da LGPD.

## 6. Como Entrar em Contato com o Responsável?

### 6.1. Controlador de Dados

**Instituição:** Polícia Rodoviária Federal
**Endereço:** Setor Policial Sul, Área 5, Quadra 2, Bloco H - Brasília/DF
**Site:** https://www.gov.br/prf

### 6.2. Encarregado de Proteção de Dados (DPO)

**Nome:** Daniel Nunes de Ávila
**E-mail:** daniel.avila@prf.gov.br
**Telefone:** (81) 9.9507-3100

### 6.3. Desenvolvedor/Operador

**Nome:** Daniel Nunes de Ávila
**Vínculo:** Servidor da PRF
**E-mail:** daniel.avila@prf.gov.br

## 7. Alterações nesta Política de Privacidade

### 7.1. Atualizações

Esta Política de Privacidade pode ser atualizada periodicamente para:
- Refletir mudanças na aplicação
- Adequar-se a novas regulamentações
- Melhorar a transparência sobre o tratamento de dados

### 7.2. Notificação

As alterações significativas serão comunicadas através de:
- Notificação na própria aplicação
- Comunicação através dos canais oficiais da PRF
- Publicação da versão atualizada com destaque das alterações

### 7.3. Vigência

Esta política entra em vigor na data de sua publicação e permanece válida até sua substituição por versão atualizada.

---

**Data de Elaboração:** 16/02/2026
**Última Atualização:** 28/02/2026
**Versão:** 1.5
**Responsável:** Polícia Rodoviária Federal

*Esta Política de Privacidade foi elaborada em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e demais normas aplicáveis à administração pública federal.*

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 16/02/2026 | Versão inicial da Política de Privacidade do SIMP |
| 1.1 | 24/02/2026 | Inclusão de dados de agendamentos de visitas técnicas nos itens de coleta e retenção |
| 1.2 | 24/02/2026 | Inclusão da flag "Suprido" (preposto do cartão corporativo) nos dados funcionais coletados |
| 1.3 | 24/02/2026 | Inclusão de dados de limites de modalidade e informações de duplicação de contratos nos dados funcionais coletados |
| 1.4 | 26/02/2026 | Inclusão de dados de chamados de manutenção (tipo de demanda, análise GUT) nos dados funcionais coletados |
| 1.5 | 28/02/2026 | Inclusão do mecanismo de aceite obrigatório de Termos de Uso e Política de Privacidade com registro de timestamp (`accepted_terms_at`) |
