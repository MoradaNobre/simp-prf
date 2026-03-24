# Catálogo de Regras de Negócio – SIMP-PRF

**Versão:** 2.0  
**Data:** 24/03/2026  
**Fonte:** SPEC.md  

---

## Histórico de Versões

- v2.0 (24/03/2026): Inclusão das regras do Relatório IMR (RN-221 a RN-232) e prazo de execução no Relatório de Execução (RN-233). Total: 233 regras.
- v1.9 (24/03/2026): Inclusão das regras do módulo de Ativos e QR Codes (RN-211 a RN-215), consolidação da Sede Nacional (RN-216 a RN-218) e badges dinâmicos de bloqueio (RN-219 a RN-220). Total: 220 regras.
- v1.8 (06/03/2026): Inclusão das regras de prazos obrigatórios (RN-203 a RN-206) e agenda unificada (RN-207 a RN-210). Total: 210 regras.
- v1.7 (28/02/2026): Inclusão das regras de aceite obrigatório de Termos de Uso (RN-198 a RN-201) e novo tipo de demanda "Usina Solar" (RN-202). Total: 202 regras.
- v1.6 (26/02/2026): Inclusão das regras do módulo de Chamados (RN-184 a RN-197) e reestruturação de relatórios PDF. Total: 197 regras.
- v1.5 (24/02/2026): Inclusão das regras de fluxo abreviado Cartão Corporativo (RN-180 a RN-182) e renumeração da duplicação de contratos (RN-183). Total: 183 regras.
- v1.4 (24/02/2026): Inclusão das regras de Limites de Modalidade (RN-170 a RN-178), duplicação de contratos (RN-179) e reordenação da hierarquia de bloqueios para 4 níveis.
- v1.3 (24/02/2026): Inclusão das regras do perfil Suprido (RN-165 a RN-169).
- v1.2 (24/02/2026): Refinamento de UI para destaque de ações críticas (Agendamento).
- v1.1 (24/02/2026): Inclusão das regras do módulo de Agenda de Visitas (RN-156 a RN-164).
- v1.0 (16/02/2026): Versão inicial do catálogo de regras.

---

## 1. Perfis e Controle de Acesso

| # | Regra |
|---|---|
| **RN-001** | O sistema possui 7 perfis de acesso: Gestor Master, Gestor Nacional, Gestor Regional, Fiscal de Contrato, Operador, Preposto e Terceirizado. Adicionalmente, existe a flag "Suprido" que pode ser acumulada com perfis de gestor e fiscal. |
| **RN-002** | O Gestor Master possui acesso global irrestrito a todas as regionais e funcionalidades do sistema. |
| **RN-003** | O Gestor Nacional possui acesso administrativo restrito às regionais vinculadas ao seu perfil. |
| **RN-004** | Os perfis Gestor Regional, Fiscal de Contrato e Operador possuem acesso restrito à(s) regional(is) atribuída(s). |
| **RN-005** | O Preposto possui acesso restrito aos contratos em que está vinculado. |
| **RN-006** | O Terceirizado possui acesso restrito aos contratos e OS em que está vinculado. |

## 2. Atribuição de Perfis

| # | Regra |
|---|---|
| **RN-007** | O Gestor Master pode atribuir todos os perfis, incluindo outros Gestores Master. |
| **RN-008** | O Gestor Nacional pode atribuir todos os perfis, **exceto** Gestor Master. |
| **RN-009** | O Gestor Regional pode atribuir todos os perfis, **exceto** Gestor Master e Gestor Nacional. |
| **RN-010** | O Fiscal de Contrato pode atribuir apenas os perfis: Preposto, Operador e Terceirizado. |
| **RN-011** | Os seletores de perfil são exibidos em ordem alfabética dos nomes em português. |

## 3. Visibilidade de Usuários

| # | Regra |
|---|---|
| **RN-012** | O Gestor Master visualiza todos os usuários do sistema, incluindo outros Gestores Master. |
| **RN-013** | O Gestor Nacional visualiza os usuários das suas regionais, mas **não** visualiza Gestores Master. |
| **RN-014** | O Gestor Regional visualiza os usuários das suas regionais, mas **não** visualiza Gestores Master nem Gestores Nacionais. |
| **RN-015** | O Fiscal de Contrato visualiza apenas usuários vinculados aos seus contratos/regionais. |
| **RN-016** | As ações de inativar e excluir usuários são restritas aos perfis Gestor Nacional e Gestor Master. |

## 4. Acesso às Páginas

| # | Regra |
|---|---|
| **RN-017** | O Dashboard é acessível aos perfis: Master, Nacional, Regional, Fiscal e Operador. |
| **RN-018** | A página de Ordens de Serviço é acessível a **todos** os perfis. |
| **RN-018a** | A página de Chamados é acessível aos perfis: Master, Nacional, Regional, Fiscal e Operador. |
| **RN-019** | A página de Relatórios OS é acessível a todos os perfis, **exceto** Operador. |
| **RN-020** | A página de Contratos é acessível aos perfis: Master, Nacional, Regional, Fiscal, Operador e Preposto. |
| **RN-021** | A página de Gestão do Orçamento é acessível aos perfis: Master, Nacional, Regional. O Fiscal possui acesso somente leitura. |
| **RN-022** | A página de Gestão do Sistema é acessível aos perfis: Master, Nacional e Regional. |
| **RN-023** | A página Sobre é acessível a **todos** os perfis. |
| **RN-024** | Preposto e Terceirizado **não** possuem acesso ao Dashboard. |
| **RN-024a** | A página Agenda (Visitas e Prazos) é acessível a **todos** os perfis. |

## 5. Autenticação

| # | Regra |
|---|---|
| **RN-025** | A autenticação é feita por e-mail e senha. |
| **RN-026** | A confirmação de e-mail é obrigatória (auto-confirm desabilitado). |
| **RN-027** | No cadastro, o campo de regional é exibido apenas para e-mails com domínio `@prf.gov.br`. |
| **RN-028** | A senha mínima é de 6 caracteres. |
| **RN-029** | Após login bem-sucedido, o usuário é redirecionado para `/app/dashboard` (ou a primeira página acessível ao seu perfil). |
| **RN-030** | Usuários com perfil Terceirizado e flag `must_change_password = true` são redirecionados para `/alterar-senha` no primeiro acesso. |
| **RN-031** | A recuperação de senha utiliza edge function customizada (`send-auth-email`), não o método padrão. |

## 6. Dashboard

| # | Regra |
|---|---|
| **RN-032** | O Dashboard possui filtro global de Regional (para perfis multi-regionais ou Master) e filtro de Contrato. |
| **RN-033** | A aba "Ordens de Serviço" exibe 4 KPIs principais: OS Abertas (Backlog), Urgentes, Concluídas no mês e MTTR Médio. |
| **RN-034** | O Backlog contabiliza todas as OS com status diferente de "encerrada". |
| **RN-035** | O "Custo por m²" é calculado como: Total de Custos ÷ Área Total das UOPs. |
| **RN-036** | A meta indicativa de proporção é 30% corretiva / 70% preventiva. |
| **RN-037** | A aba "Orçamento" é acessível aos perfis: Master, Nacional, Regional e Fiscal. |
| **RN-038** | O gráfico "Cota vs Consumido por Regional" é exibido inicialmente em ordem decrescente de cota. |
| **RN-039** | O Dashboard possui refresh automático a cada 30 segundos. |

## 7. Ordens de Serviço – Geral

| # | Regra |
|---|---|
| **RN-040** | Todos os perfis podem visualizar a listagem de Ordens de Serviço. |
| **RN-041** | A criação de OS é permitida para todos os perfis, **exceto** Preposto e Terceirizado. |
| **RN-042** | A edição de OS é permitida para os perfis: Master, Nacional, Regional e Fiscal. |
| **RN-043** | A exclusão de OS é permitida para: Solicitante da OS, Master, Nacional e Regional. |
| **RN-044** | O código da OS segue o formato `{SIGLA_REGIONAL}-{ANO}-{SEQUENCIAL_5_DIGITOS}` (ex.: SPRF/SC-2026-00042). |
| **RN-045** | O código é gerado automaticamente pela tabela `regional_os_seq`, com incremento por regional. |
| **RN-046** | O solicitante da OS é automaticamente o usuário logado. |
| **RN-047** | Os campos obrigatórios na criação de OS são: Título, Tipo (corretiva/preventiva), Regional e UOP. |

## 8. Fluxo de Status da OS (8 Etapas)

| # | Regra |
|---|---|
| **RN-048** | O ciclo de vida da OS compreende 8 etapas sequenciais: Aberta → Orçamento → Autorização → Execução → Ateste → Faturamento → Pagamento → Encerrada. |
| **RN-049** | Cada transição de status é registrada com timestamp e identificação do responsável. |

### 8.1. Transições

| # | Regra |
|---|---|
| **RN-050** | A transição Aberta → Orçamento requer a vinculação obrigatória de um contrato vigente da mesma regional. |
| **RN-051** | Na transição Aberta → Orçamento, é possível alterar a prioridade da OS. |
| **RN-052** | A transição Orçamento → Autorização requer upload obrigatório do arquivo de orçamento (Excel/PDF) e informação do valor do orçamento (obrigatório, > 0). |
| **RN-053** | A transição Orçamento → Autorização é realizada pelo Preposto ou Terceirizado. |
| **RN-054** | A transição Autorização → Execução é realizada pelo Gestor ou Fiscal. |
| **RN-055** | A transição Execução → Ateste requer upload obrigatório da foto "depois" (evidência). |
| **RN-056** | A transição Execução → Ateste é realizada pelo Preposto ou Terceirizado. |
| **RN-057** | Na transição Execução → Ateste, o registro de custos é opcional. |
| **RN-058** | A transição Ateste → Faturamento é denominada "Aprovar e Autorizar Emissão da Nota Fiscal". |
| **RN-059** | A transição Ateste → Faturamento é permitida para Gestor, Fiscal e Operador. |
| **RN-060** | A transição Faturamento → Pagamento requer upload obrigatório de documentos fiscais e certidões. |
| **RN-061** | A transição Faturamento → Pagamento é realizada pelo Preposto ou Terceirizado. |
| **RN-062** | A transição Pagamento → Encerrada é realizada pelo Gestor ou Fiscal. |
| **RN-063** | Na transição Pagamento → Encerrada, a assinatura digital (texto) é opcional. |

### 8.2. Ações Automáticas nas Transições

| # | Regra |
|---|---|
| **RN-064** | Ao avançar para Execução (Autorização → Execução), o sistema gera automaticamente um Relatório de Execução em PDF, salva na tabela `relatorios_execucao` e envia por e-mail via edge function `send-os-execucao`. |
| **RN-065** | Todas as transições de status disparam notificação por e-mail aos stakeholders pertinentes. |
| **RN-066** | A notificação da transição para Faturamento é enviada **exclusivamente** ao Preposto. |
| **RN-067** | Notificações de transição **não** são enviadas ao Gestor Nacional. |

### 8.3. Restituição

| # | Regra |
|---|---|
| **RN-068** | A restituição (retorno à etapa anterior) é permitida para Gestor e Fiscal. |
| **RN-069** | A restituição é permitida em qualquer etapa, **exceto** "Aberta" e "Encerrada". |
| **RN-070** | O motivo da restituição é campo obrigatório. |
| **RN-071** | A restituição gera notificação por e-mail com o motivo informado. |

## 9. Bloqueio de Autorização (Regras de Saldo)

| # | Regra |
|---|---|
| **RN-072** | A transição Autorização → Execução é submetida a bloqueios estritos e sequenciais de saldo. A interface exibe apenas o bloqueio de maior prioridade ativo. |
| **RN-073** | **1º Bloqueio – Cota Regional:** A cota total da regional (dotação + créditos − reduções) menos o consumo total deve ser ≥ valor do orçamento. Se insuficiente, o fluxo é **absolutamente bloqueado** para todos os perfis, incluindo Gestor Master. |
| **RN-074** | Quando o bloqueio de cota regional é ativado, o sistema exibe botão para criar solicitação de crédito. |
| **RN-075** | **2º Bloqueio – Saldo de Contrato:** O saldo do contrato (valor total + aditivos − custos de OS em execução+) deve ser ≥ valor do orçamento da OS. Se insuficiente, o fluxo é bloqueado com sugestão de inclusão de aditivo. **Exceção:** contratos do tipo "Contrata + Brasil" ignoram este bloqueio. |
| **RN-076** | Quando o bloqueio de contrato é ativado, o sistema exibe alerta com link para gestão de contratos e sugere inclusão de aditivo. |
| **RN-077** | **3º Bloqueio – Limite de Modalidade:** Para contratos do tipo "Cartão Corporativo" e "Contrata + Brasil", a soma dos orçamentos de OS autorizadas (status > orçamento) na mesma regional/ano/modalidade + a OS atual não pode ultrapassar o teto cadastrado na tabela `limites_modalidade`. Se não cadastrado, a autorização é bloqueada. |
| **RN-077a** | A interface de autorização exibe painel informativo com **Teto**, **Consumido** e **Disponível** para a modalidade, além de botão para gerenciar limites. |
| **RN-078** | **4º Bloqueio – Valor Empenhado:** O saldo empenhado da regional deve ser suficiente para cobrir o valor do orçamento. |
| **RN-078a** | A OS permanece sobrestada até a recomposição do saldo em qualquer nível de bloqueio. |

## 10. Exclusão de OS

| # | Regra |
|---|---|
| **RN-079** | A exclusão de uma OS exige o expurgo prévio em cascata de: solicitações de crédito, custos (`os_custos`), relatórios de execução e relatórios de pagamento. |
| **RN-080** | A exclusão requer confirmação via AlertDialog. |

## 11. Contratos

| # | Regra |
|---|---|
| **RN-081** | A visualização de contratos é acessível aos perfis: Master, Nacional, Regional, Fiscal, Operador e Preposto. |
| **RN-082** | A criação e edição de contratos é restrita aos perfis: Master, Nacional, Regional e Fiscal. |
| **RN-083** | A exclusão de contratos é restrita aos perfis: Master, Nacional e Regional. |
| **RN-084** | O gerenciamento de aditivos é restrito aos perfis: Master, Nacional, Regional e Fiscal. |
| **RN-085** | O Preposto pode gerenciar contatos do contrato em que está vinculado. |
| **RN-086** | O Preposto visualiza apenas os contratos em que está vinculado. |
| **RN-087** | O status do contrato (Vigente/Encerrado) é calculado automaticamente pela data atual versus o período de vigência. |
| **RN-088** | O formulário de cadastro e edição de contratos filtra as regionais disponíveis com base no perfil do usuário. |
| **RN-089** | O e-mail do Preposto é sincronizado da base de usuários no momento da vinculação ao contrato. |

## 12. Saldo do Contrato

| # | Regra |
|---|---|
| **RN-090** | O saldo do contrato é calculado como: (Valor Total + Σ Aditivos) − Σ Custos de OS vinculadas com status ≥ Execução. |
| **RN-091** | "Em Execução+" inclui OS que saíram dos status Aberta, Orçamento e Autorização (status ≥ execução). |
| **RN-092** | O saldo negativo é destacado visualmente em vermelho. |
| **RN-093** | Os aditivos contratuais são somados ao valor total para cálculo do saldo. |
| **RN-094** | O saldo é disponibilizado pela view materializada `contratos_saldo`. |

## 13. Relatórios OS

| # | Regra |
|---|---|
| **RN-095** | A página de Relatórios OS é acessível a todos os perfis, exceto Operador. |
| **RN-096** | Preposto e Terceirizado visualizam apenas a aba "Execução". |
| **RN-097** | Preposto e Terceirizado veem apenas relatórios de execução dos seus contratos. |
| **RN-098** | A aba "Pagamento" é ocultada para Preposto e Terceirizado. |
| **RN-099** | O Relatório de Execução é gerado automaticamente na transição Autorização → Execução. |
| **RN-100** | O Relatório de Pagamento é gerado manualmente pelo Gestor/Fiscal na fase de Pagamento/Encerramento. |

## 14. Gestão do Orçamento

| # | Regra |
|---|---|
| **RN-101** | A aba "Portaria Orçamentária" é acessível apenas ao Gestor Nacional e Gestor Master. |
| **RN-102** | A tabela "Limite por Regional" na aba Portaria Orçamentária é exibida inicialmente em ordem decrescente de valor. |
| **RN-103** | A aba "Cotas" permite gerenciar dotações por regional, com créditos (Cota Inicial, Suplementação, Redução) e empenhos. |
| **RN-104** | O Fiscal possui acesso somente leitura às Cotas, podendo apenas criar e visualizar Solicitações de Crédito. |
| **RN-105** | Solicitações de crédito podem ser avulsas (sem OS) ou vinculadas a uma OS. |
| **RN-106** | A aprovação de solicitação de crédito (total ou parcial) cria automaticamente um registro de crédito na tabela `orcamento_creditos` com tipo "suplementação". |
| **RN-107** | A resposta a solicitações de crédito é restrita aos perfis Gestor Nacional e Gestor Master. |
| **RN-108** | A aprovação parcial requer informar o valor aprovado. |

## 15. Saldo Orçamentário

| # | Regra |
|---|---|
| **RN-109** | A Cota Total é calculada como: Valor Dotação + Σ Créditos (suplementações − reduções). |
| **RN-110** | O Total Consumido é calculado como: Σ Empenhos + Σ Custos de OS. |
| **RN-111** | O Saldo Orçamentário é calculado como: Cota Total − Total Consumido. |
| **RN-112** | O saldo orçamentário é disponibilizado pela view `vw_orcamento_regional_saldo`. |

## 16. Gestão do Sistema

| # | Regra |
|---|---|
| **RN-113** | A aba "Regionais" é acessível apenas ao Gestor Master e Gestor Nacional. |
| **RN-114** | Apenas o Gestor Master pode criar novas regionais. |
| **RN-115** | O Gestor Nacional pode editar regionais vinculadas ao seu perfil. |
| **RN-116** | A aba "Auditoria" é acessível apenas ao Gestor Master e Gestor Nacional. |
| **RN-117** | A exclusão de logs de auditoria é restrita ao Gestor Master. |
| **RN-118** | A importação de planilha (CSV/XLSX) é restrita aos perfis Gestor Nacional e Gestor Master. |
| **RN-119** | A importação cria regionais, delegacias e UOPs em lote via edge function `import-csv`. |

## 17. Criação de Usuários

| # | Regra |
|---|---|
| **RN-120** | A criação de usuários internos requer: nome, e-mail, senha, perfil e regional(is). |
| **RN-121** | A criação de usuários de contrato (Preposto/Terceirizado) utiliza a edge function `create-contract-user`. |
| **RN-122** | A exclusão de usuários utiliza a edge function `delete-user`. |

## 18. Notificações por E-mail

| # | Regra |
|---|---|
| **RN-123** | Notificações são enviadas automaticamente em cada transição de status da OS. |
| **RN-124** | Os destinatários são determinados pelo contexto: fiscal, preposto, terceirizado, gestores regionais. |
| **RN-125** | O Gestor Nacional **não** recebe notificações de transição de OS. |
| **RN-126** | As notificações são enviadas via edge functions: `notify-os-transition`, `notify-preposto` e `send-os-execucao`. |
| **RN-127** | Os e-mails utilizam o domínio `simp.estudioai.site`. |
| **RN-128** | Cada e-mail inclui botão de acesso direto ao sistema. |
| **RN-129** | Em caso de falha no envio, o sistema exibe aviso visual (fallback). |

### 18.1. Destinatários por Transição

| # | Regra |
|---|---|
| **RN-130** | Transição para Aberta: notifica Gestor Regional. |
| **RN-131** | Transição para Orçamento: notifica Preposto. |
| **RN-132** | Transição para Autorização: notifica Gestor Regional e Fiscal. |
| **RN-133** | Transição para Execução: notifica Preposto e Técnico (com PDF da Ordem de Execução anexo). |
| **RN-134** | Transição para Faturamento: notifica **exclusivamente** o Preposto. |
| **RN-135** | Transição para Pagamento: notifica Preposto, Gestor Regional e Fiscal. |
| **RN-136** | Transição para Encerrada: notifica Preposto, Gestor Regional e Fiscal. |
| **RN-137** | Restituição: notifica apenas o responsável pela etapa de destino. |

## 19. Auditoria e Segurança

| # | Regra |
|---|---|
| **RN-138** | Todas as tabelas possuem Row Level Security (RLS) habilitado. |
| **RN-139** | As políticas de RLS implementam isolamento por regional e perfil de acesso. |
| **RN-140** | A tabela `audit_logs` registra automaticamente ações de criação, alteração e exclusão com dados antigos e novos. |
| **RN-141** | Triggers automáticos registram eventos críticos em tabelas sensíveis. |
| **RN-142** | Logs de auditoria são mantidos indefinidamente. |

## 20. Upload de Arquivos

| # | Regra |
|---|---|
| **RN-143** | O bucket de storage utilizado é `os-fotos`. |
| **RN-144** | Os tipos aceitos incluem: imagens (fotos antes/depois), PDFs e Excel (orçamentos) e documentos de pagamento. |
| **RN-145** | A nomeação dos arquivos utiliza UUID aleatório para evitar colisões. |
| **RN-146** | Os arquivos possuem URLs públicas para exibição inline. |

## 21. Interface e Responsividade

| # | Regra |
|---|---|
| **RN-147** | O sistema suporta temas claro e escuro, com persistência via `next-themes`. |
| **RN-148** | O tema padrão é claro. |
| **RN-149** | A interface é responsiva: tabelas são convertidas em cards em telas pequenas. |
| **RN-150** | Filtros e sidebar são colapsáveis em mobile. |
| **RN-151** | O Dashboard possui atualização automática a cada 30 segundos. |
| **RN-152** | Demais páginas utilizam invalidação de cache via TanStack React Query em mutations. |

## 22. Rotas Especiais

| # | Regra |
|---|---|
| **RN-153** | A rota `/definir-responsavel/:osId` é uma página externa para definir responsável de OS via link enviado por e-mail. |
| **RN-154** | A rota `/alterar-senha` é utilizada para alteração obrigatória de senha de terceirizados no primeiro acesso. |
| **RN-155** | Qualquer rota não mapeada exibe a página 404 (NotFound). |

## 23. Agenda (Visitas e Prazos)

| # | Regra |
|---|---|
| **RN-156** | Agendamentos de visita só podem ser criados quando a OS vinculada está no status "Execução". |
| **RN-157** | A criação e edição de agendamentos é permitida para os perfis: Preposto e Terceirizado. |
| **RN-158** | O gerenciamento de agendamentos (qualquer OS) é permitido para os perfis: Master, Nacional, Regional e Fiscal. |
| **RN-159** | O Operador possui acesso somente leitura aos agendamentos. |
| **RN-160** | Cada agendamento contém obrigatoriamente: data do agendamento, descrição da atividade e responsável técnico. |
| **RN-161** | O status do agendamento pode ser: agendada (padrão), realizada ou cancelada. |
| **RN-162** | O campo "observações pós-visita" é opcional e pode ser preenchido após a realização da visita. |
| **RN-163** | A agenda unificada exibe visitas técnicas e prazos de OS em um calendário mensal com abas (Tudo, Prazos, Visitas) e filtros de status de prazo (Pendentes, Vencidos, Todos). |
| **RN-164** | As políticas de RLS da tabela `agendamentos_visita` implementam isolamento por regional e contrato, análogo às demais tabelas operacionais. |

## 24. Perfil Suprido (Cartão Corporativo)

| # | Regra |
|---|---|
| **RN-165** | O "Suprido" é uma flag booleana (`is_suprido`) na tabela `profiles`, não um perfil de acesso independente. |
| **RN-166** | A flag Suprido pode ser acumulada exclusivamente com os perfis: Gestor Regional, Gestor Nacional, Gestor Master e Fiscal de Contrato. |
| **RN-167** | A marcação de Suprido é gerenciada via checkbox no formulário de edição de usuário na Gestão do Sistema. |
| **RN-168** | O checkbox de Suprido é exibido apenas quando o perfil do usuário é gestor ou fiscal. |
| **RN-169** | Usuários marcados como Suprido exibem badge visual "Suprido" na listagem de usuários (desktop e mobile) e na sidebar. |

## 25. Limites de Modalidade

| # | Regra |
|---|---|
| **RN-170** | A tabela `limites_modalidade` armazena o teto anual por modalidade (Cartão Corporativo, Contrata + Brasil) e regional. |
| **RN-171** | A gestão de limites de modalidade é acessível na aba "Limites Modalidade" da Gestão do Sistema. |
| **RN-172** | A criação de limites é restrita aos perfis: Master, Nacional e Regional. |
| **RN-173** | A edição inline de limites permite alterar o valor do teto diretamente na tabela, com confirmação por Enter e cancelamento por Escape. |
| **RN-174** | A exclusão de limites é restrita aos mesmos perfis que podem criá-los. |
| **RN-175** | O bloqueio de limite de modalidade é aplicado apenas para contratos do tipo "Cartão Corporativo" e "Contrata + Brasil". |
| **RN-176** | O consumo de modalidade é calculado pela soma dos `valor_orcamento` de todas as OS na mesma regional/ano/modalidade com status além de "orçamento". |
| **RN-177** | A verificação de limite ocorre na etapa de Autorização, como 3º nível de bloqueio na hierarquia. |
| **RN-178** | Se nenhum limite estiver cadastrado para a combinação regional/ano/modalidade, a autorização é bloqueada com solicitação de cadastro. |

## 26. Fluxo Abreviado – Cartão Corporativo

| # | Regra |
|---|---|
| **RN-180** | Para OS vinculadas a contratos do tipo "Cartão Corporativo", o fluxo pula as etapas de Faturamento e Pagamento, indo diretamente do Ateste para Encerrada. |
| **RN-181** | O Suprido (agente de cartão corporativo) pode avançar as etapas de Orçamento e Execução em OS vinculadas a contratos Cartão Corporativo, atuando como responsável interno pela demanda. |
| **RN-182** | Em contratos do tipo "Cartão Corporativo", o campo "Preposto" no formulário de contrato é substituído por "Suprido", filtrando automaticamente apenas usuários com a flag `is_suprido = true`. |

## 27. Duplicação de Contratos

| # | Regra |
|---|---|
| **RN-183** | Contratos do tipo "Cartão Corporativo" possuem a opção de duplicação, que abre o formulário de novo contrato pré-preenchido com os dados do contrato original (exceto número e datas de vigência). |

## 28. Chamados

| # | Regra |
|---|---|
| **RN-184** | Chamados podem ser criados por todos os perfis, exceto Preposto e Terceirizado. |
| **RN-185** | O fluxo de status do chamado é: Aberto → Analisado → Vinculado (a uma OS) ou Cancelado. |
| **RN-186** | A análise de chamados (Matriz GUT) é restrita aos perfis: Master, Nacional, Regional e Fiscal. |
| **RN-187** | A Matriz GUT consiste em notas de 1 a 5 para Gravidade, Urgência e Tendência. O score é G × U × T (mín: 1, máx: 125). |
| **RN-188** | A geração de OS a partir de chamados é restrita aos perfis: Master, Nacional, Regional e Fiscal. |
| **RN-189** | Múltiplos chamados analisados podem ser agrupados em uma única OS corretiva. |
| **RN-190** | A prioridade da OS gerada é derivada do maior score GUT: ≥64 urgente, ≥27 alta, ≥8 média, <8 baixa. |
| **RN-191** | Ao gerar a OS, todos os chamados selecionados são vinculados automaticamente (campo `os_id`) e passam para status "Vinculado". |
| **RN-192** | O cancelamento de chamados requer motivo obrigatório e é restrito a Gestores e Fiscais. |
| **RN-193** | Chamados com status "Vinculado" não podem ser cancelados. |
| **RN-194** | O Operador pode editar apenas seus próprios chamados enquanto estiverem com status "Aberto". |
| **RN-195** | O código do chamado é gerado automaticamente pelo banco de dados (tabela `chamados`, campo `codigo`). |

## 29. Relatórios PDF – Chamados Vinculados

| # | Regra |
|---|---|
| **RN-196** | Os relatórios PDF de OS (Execução e Pagamento) incluem seção "Chamados Vinculados" com: código, tipo de demanda, local, solicitante e Matriz GUT (G×U×T=Score). |
| **RN-197** | O relatório PDF de Contrato inclui resumo de chamados (total e OS originadas) e coluna "CH" (chamados vinculados) na tabela de OS por ano. |

---

## 30. Aceite Obrigatório de Termos de Uso e Política de Privacidade

| # | Regra |
|---|---|
| **RN-198** | Todo usuário deve aceitar os Termos de Uso e a Política de Privacidade antes de utilizar o sistema. Enquanto `accepted_terms_at` for nulo, um dialog modal bloqueante impede o acesso às funcionalidades. |
| **RN-199** | O dialog de aceite exibe 5 cláusulas dos Termos de Uso (Objeto, Acesso, Responsabilidades, Proibições, Auditoria) e a Política de Privacidade (LGPD). O usuário deve marcar dois checkboxes (Termos e Privacidade) para habilitar o botão "Aceitar e Continuar". |
| **RN-200** | O dialog de aceite não pode ser fechado por clique fora da área ou pela tecla Escape, garantindo que o usuário leia e aceite explicitamente. |
| **RN-201** | Ao aceitar, o sistema registra o timestamp atual na coluna `profiles.accepted_terms_at`, desbloqueando o acesso ao sistema. |

## 31. Tipos de Demanda Adicionais

| # | Regra |
|---|---|
| **RN-202** | O sistema suporta 10 tipos de demanda para chamados e OS: Hidráulico, Elétrico, Iluminação, Incêndio, Estrutura, Rede Lógica, Elevadores, Ar Condicionado, Instalações Diversas e Usina Solar. |

---

## 32. Prazos Obrigatórios de OS

| # | Regra |
|---|---|
| **RN-203** | Na transição Aberta → Orçamento, é obrigatório definir o prazo para apresentação do orçamento (`prazo_orcamento`). A transição é bloqueada se o campo não estiver preenchido. |
| **RN-204** | Na transição Autorização → Execução, é obrigatório definir o prazo para conclusão da execução (`prazo_execucao`). A transição é bloqueada se o campo não estiver preenchido. |
| **RN-205** | Um prazo é considerado **vencido** quando a data do prazo já passou e a OS ainda está na etapa correspondente (Orçamento para `prazo_orcamento`, Execução para `prazo_execucao`). |
| **RN-206** | Um prazo é considerado **próximo ao vencimento** quando faltam 3 dias ou menos para a data limite e a OS ainda está na etapa correspondente. |

## 33. Agenda Unificada

| # | Regra |
|---|---|
| **RN-207** | A agenda exibe cards de resumo com contadores em tempo real: Prazos Vencidos (vermelho), Vencendo em 3 dias (amarelo) e Visitas Agendadas (roxo). |
| **RN-208** | O calendário unificado codifica eventos por cores: roxo (visita agendada), verde (visita realizada), vermelho (visita cancelada ou prazo vencido), laranja (prazo de orçamento), azul (prazo de execução), amarelo (prazo próximo ao vencimento). |
| **RN-209** | Clicar em um evento de prazo abre o diálogo de detalhes da OS correspondente. Clicar em um evento de visita abre o diálogo de detalhes do agendamento. |
| **RN-210** | O painel lateral exibe os eventos do dia selecionado ou, quando nenhum dia está selecionado, os próximos 10 eventos ordenados por data. |

---

## 34. Módulo de Ativos e QR Codes

| # | Regra |
|---|---|
| **RN-211** | O módulo de Ativos permite o cadastro hierárquico da infraestrutura predial em três níveis: Regional → Delegacia/Sede Regional → UOP/Anexo. |
| **RN-212** | O formulário "Novo Ativo" possui três abas: Delegacia/Sede Regional, UOP/Anexo e Nacional. A aba Nacional utiliza labels dinâmicos: "Diretoria" (Delegacia) e "Anexo / Edifício" (UOP). |
| **RN-213** | QR Codes são gerados automaticamente para cada UOP cadastrada, contendo a URL de abertura rápida de chamado com a hierarquia de localização pré-preenchida. |
| **RN-214** | O escaneamento do QR Code redireciona o usuário para o formulário de Novo Chamado após autenticação, com Regional, Delegacia e UOP automaticamente preenchidos. |
| **RN-215** | Os QR Codes podem ser baixados individualmente em formato PNG para impressão e fixação nos ambientes físicos. |

## 35. Consolidação da Sede Nacional

| # | Regra |
|---|---|
| **RN-216** | O registro "SEDE NACIONAL" (UASG 200109) é único no sistema e compartilhado entre os módulos de Ativos, Chamados e Gestão de Regionais. |
| **RN-217** | O registro da Sede Nacional é protegido: exibe badge "Protegida" na Gestão de Regionais e não possui botão de exclusão. |
| **RN-218** | Para chamados e ativos vinculados à Sede Nacional, os labels "Delegacia" e "UOP" são substituídos dinamicamente por "Diretoria" e "Anexo / Edifício", respectivamente. |

## 36. Badges Dinâmicos de Bloqueio

| # | Regra |
|---|---|
| **RN-219** | Na etapa de Autorização, o sistema exibe badges dinâmicos conforme o motivo específico do bloqueio: "Aguard. Cota" (cota regional insuficiente), "Aguard. Empenho" (saldo empenhado insuficiente), "Saldo Contrato Insuf." (saldo do contrato insuficiente) ou "Limite Excedido" (limite de modalidade ultrapassado). |
| **RN-220** | O campo `motivo_bloqueio` da OS armazena o bloqueio de maior prioridade ativo (cota > contrato > limite > empenho) sem alterar o status da OS, que permanece em "autorizacao". |

---

**Total de Regras de Negócio:** 220

---

*Catálogo de Regras de Negócio extraído do SPEC.md — SIMP-PRF.*  
*Versão 1.9 — 24/03/2026*

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 22/02/2026 | Versão inicial com 155 regras de negócio |
| 1.1 | 24/02/2026 | Adição da seção 23 – Agenda de Visitas (RN-156 a RN-164). Total: 164 regras |
| 1.2 | 24/02/2026 | Refinamento de UI para destaque de ações críticas (Agendamento) |
| 1.3 | 24/02/2026 | Inclusão da seção 24 – Perfil Suprido / Cartão Corporativo (RN-165 a RN-169). Total: 169 regras |
| 1.4 | 24/02/2026 | Inclusão das seções 25 e 26 – Limites de Modalidade (RN-170 a RN-178) e Duplicação de Contratos (RN-179). Total: 179 regras |
| 1.5 | 24/02/2026 | Inclusão da seção 26 – Fluxo Abreviado Cartão Corporativo (RN-180 a RN-182), renumeração (RN-183). Total: 183 regras |
| 1.6 | 26/02/2026 | Inclusão das seções 28 e 29 – Chamados (RN-184 a RN-195) e Relatórios PDF com chamados (RN-196 a RN-197). Total: 197 regras |
| 1.7 | 28/02/2026 | Inclusão das seções 30 e 31 – Aceite obrigatório de Termos (RN-198 a RN-201) e tipo de demanda Usina Solar (RN-202). Total: 202 regras |
| 1.8 | 06/03/2026 | Inclusão das seções 32 e 33 – Prazos Obrigatórios de OS (RN-203 a RN-206) e Agenda Unificada (RN-207 a RN-210). Total: 210 regras |
| 1.9 | 24/03/2026 | Inclusão das seções 34, 35 e 36 – Ativos e QR Codes (RN-211 a RN-215), Sede Nacional (RN-216 a RN-218) e Badges Dinâmicos (RN-219 a RN-220). Total: 220 regras |
