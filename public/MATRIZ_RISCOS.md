# Matriz de Riscos – SIMP (Sistema de Manutenção Predial)

**Órgão:** Polícia Rodoviária Federal  
**Sistema:** SIMP-PRF  
**Versão:** 1.6  
**Data de Elaboração:** 28/02/2026  
**Última Atualização:** 28/02/2026
**Responsável:** Daniel Nunes de Ávila  
**Classificação:** Documento Institucional – Uso Interno

---

## 1. Introdução

A presente Matriz de Riscos tem por objetivo identificar, classificar e avaliar os riscos inerentes à operação do SIMP-PRF, sistema de gestão de manutenção predial desenvolvido para uso institucional da Polícia Rodoviária Federal. A análise contempla riscos estratégicos, orçamentários, operacionais, de segurança da informação, de conformidade administrativa, tecnológicos e de continuidade do negócio.

A metodologia adotada baseia-se em abordagem qualitativa de avaliação de riscos, compatível com práticas reconhecidas de gestão de riscos no setor público, considerando probabilidade de ocorrência e magnitude do impacto para classificação do nível de risco resultante.

### 1.1. Escala de Probabilidade

| Nível | Descrição |
|-------|-----------|
| Baixa | Evento improvável nas condições atuais de operação |
| Média | Evento possível, com precedentes ou condições favoráveis à ocorrência |
| Alta | Evento provável, com indicadores ou histórico de ocorrência |

### 1.2. Escala de Impacto

| Nível | Descrição |
|-------|-----------|
| Baixo | Impacto limitado, sem prejuízo significativo à operação |
| Médio | Impacto moderado, com necessidade de ação corretiva pontual |
| Alto | Impacto significativo, comprometendo processos críticos ou conformidade |
| Muito Alto | Impacto severo, com potencial de dano institucional, financeiro ou legal |

### 1.3. Matriz de Nível de Risco

| Probabilidade \ Impacto | Baixo | Médio | Alto | Muito Alto |
|--------------------------|-------|-------|------|------------|
| **Alta** | Médio | Alto | Crítico | Crítico |
| **Média** | Baixo | Médio | Alto | Crítico |
| **Baixa** | Baixo | Baixo | Médio | Alto |

---

## 2. Matriz de Riscos

### 2.1. Riscos Estratégicos

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| RE-01 | Estratégico | Dependência de desenvolvedor único para evolução e manutenção do sistema | Concentração de conhecimento técnico em um único profissional, sem equipe de suporte ou backup técnico | Paralisação da evolução do sistema, impossibilidade de correção de vulnerabilidades críticas, perda de continuidade institucional | Alta | Muito Alto | **Crítico** | Documentação técnica (TECHNICAL_DOCS.md, SPEC.md, REGRAS_NEGOCIO.md); código-fonte versionado em Git | Ausência de equipe de desenvolvimento; ausência de plano de sucessão técnica; documentação concentrada em artefatos estáticos sem transferência de conhecimento formal | Estabelecer plano de contingência com identificação de profissional backup; promover treinamento técnico para ao menos 1 servidor adicional; documentar procedimentos operacionais de manutenção do sistema | Preventivo | Crítica |
| RE-02 | Estratégico | Perda de aderência do sistema às necessidades institucionais | Evolução das demandas operacionais sem correspondente atualização do sistema; mudanças normativas não refletidas | Subutilização do sistema, adoção de controles paralelos (planilhas), perda de confiabilidade dos dados | Média | Alto | **Alto** | Documentação de regras de negócio (197 regras numeradas); PRD formalizado; ciclo de atualizações via Lovable | Ausência de comitê gestor formal para priorização de demandas; processo de levantamento de requisitos informal | Instituir processo formal de gestão de demandas com priorização periódica; designar ponto focal por regional para feedback operacional | Preventivo | Alta |
| RE-03 | Estratégico | Dano reputacional institucional por falha sistêmica em gestão de contratos | Erro no cálculo de saldo contratual, autorização indevida de despesa, ou inconsistência em relatórios de prestação de contas | Questionamento por órgãos de controle, exposição midiática negativa, responsabilização de gestores | Baixa | Muito Alto | **Alto** | View materializada `contratos_saldo` com cálculo automático; bloqueio de autorização por insuficiência de saldo; trilha de auditoria completa | Dependência de view materializada que pode apresentar inconsistência temporária; ausência de reconciliação periódica automatizada entre view e dados-fonte | Implementar rotina de reconciliação periódica (semanal) entre saldo calculado e registros individuais; gerar relatório de consistência para validação gerencial | Detectivo | Alta |

### 2.2. Riscos Orçamentários

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| RO-01 | Orçamentário | Bloqueio indevido de Ordem de Serviço por falha no cálculo de saldo orçamentário regional | Inconsistência entre valores registrados na view `vw_orcamento_regional_saldo` e os registros das tabelas-fonte (`orcamento_anual`, `orcamento_empenhos`, `orcamento_creditos`); defasagem temporal na atualização da view | Paralisação de serviços de manutenção em unidades com demanda legítima; atraso na execução contratual; risco de deterioração patrimonial | Média | Alto | **Alto** | View `vw_orcamento_regional_saldo` com `security_invoker = on`; 4 níveis de bloqueio na autorização; bypass configurável para modalidades especiais (Cartão Corporativo, Contrata + Brasil) | View pode apresentar valores defasados em cenários de alta concorrência; ausência de mecanismo de alerta quando o saldo se aproxima do limite; não há validação cruzada automatizada | Implementar alerta automático quando saldo regional atingir 20% do limite; criar rotina de reconciliação diária; adicionar log específico para eventos de bloqueio orçamentário | Preventivo / Detectivo | Alta |
| RO-02 | Orçamentário | Autorização indevida de despesa acima do saldo contratual disponível | Falha na view `contratos_saldo`; concorrência simultânea de múltiplas autorizações sobre o mesmo contrato; bypass inadequado de modalidade especial | Comprometimento financeiro acima do valor contratado; irregularidade administrativa; responsabilização do ordenador de despesa | Baixa | Muito Alto | **Alto** | Bloqueio automático por insuficiência de saldo contratual (2º nível); view `contratos_saldo` com cálculo de saldo = valor_total + aditivos - custos; função `transition_os_status` com validação server-side | Ausência de lock pessimista em operações concorrentes; view não utiliza transação atômica para cálculo em tempo real; possibilidade de race condition em autorizações simultâneas | Implementar lock de registro (SELECT FOR UPDATE) na função `transition_os_status` para operações de autorização; adicionar validação dupla (client + server) do saldo antes da transição | Preventivo | Crítica |
| RO-03 | Orçamentário | Manipulação de limites de modalidade por usuário com perfil regional | Gestor Regional altera valor_limite para viabilizar autorização de OS que excede teto real da modalidade | Descumprimento de limites administrativos; exposição a questionamento de auditoria | Média | Alto | **Alto** | Tabela `limites_modalidade` com RLS por regional; edição inline com registro de `updated_at`; trilha de auditoria | Ausência de workflow de aprovação para alteração de limites; não há registro do valor anterior na trilha de auditoria para este campo específico; Gestor Regional pode alterar limite e autorizar OS na mesma sessão | Implementar trigger de auditoria específico para alterações em `limites_modalidade` registrando valores anterior e novo; avaliar exigência de dupla aprovação (quatro olhos) para alteração de limites | Detectivo | Alta |
| RO-04 | Orçamentário | Inconsistência entre saldo calculado por view materializada e saldo real | Inserção/exclusão de custos (`os_custos`) ou aditivos (`contrato_aditivos`) sem correspondente atualização imediata da view; cache de query no frontend | Decisões gerenciais baseadas em dados incorretos; autorização de despesas sem cobertura; divergência em prestação de contas | Média | Alto | **Alto** | View `contratos_saldo` calculada em tempo real (não é materializada com refresh manual); TanStack React Query com invalidação de cache; recálculo automático na interface | A view é recalculada a cada consulta mas pode sofrer com plano de execução subótimo em volume alto; cache do React Query pode apresentar valor defasado por até 30 segundos; ausência de teste automatizado de consistência | Implementar teste automatizado periódico de consistência (soma de custos vs. saldo da view); reduzir staleTime do React Query para consultas de saldo críticas; adicionar indicador visual de "última atualização" na interface | Detectivo | Média |

### 2.3. Riscos Operacionais

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| ROP-01 | Operacional | Falha na entrega de notificações automáticas por e-mail nas transições de status de OS | Indisponibilidade do serviço de e-mail; falha na Edge Function `notify-os-transition`; e-mail do destinatário inválido ou desatualizado; timeout da função serverless | Fiscal ou preposto não toma ciência de transição crítica (ex: ateste, faturamento); atraso na execução contratual; descumprimento de prazos | Alta | Médio | **Alto** | Edge Functions dedicadas (`notify-os-transition`, `notify-preposto`, `send-os-execucao`); registro de `email_enviado` e `email_destinatarios` em `relatorios_execucao` | Ausência de mecanismo de retry automático em caso de falha; não há monitoramento ativo de taxa de sucesso de envio; ausência de fila de mensagens (dead letter queue) | Implementar mecanismo de retry com backoff exponencial; criar dashboard de monitoramento de entregas; implementar fila de mensagens pendentes com reprocessamento | Corretivo / Preventivo | Alta |
| ROP-02 | Operacional | Exclusão indevida de dados históricos (chamados, OS, relatórios) | Ação deliberada ou acidental por usuário com perfil de alto privilégio; ausência de soft delete em tabelas críticas; falha no controle de permissões de exclusão | Perda irreversível de trilha de auditoria; impossibilidade de prestação de contas; comprometimento de histórico operacional | Baixa | Muito Alto | **Alto** | **[MITIGADO]** Soft delete implementado nas tabelas `ordens_servico`, `chamados` e `contratos` com campo `deleted_at`. Políticas de DELETE removidas — exclusão física bloqueada via RLS. Registros "excluídos" permanecem no banco com timestamp, invisíveis nas consultas normais. View `contratos_saldo` filtra registros soft-deleted. Índices parciais otimizam performance. Edge Function `delete-user` atualizada para soft-delete. | Registros soft-deleted ainda podem ser acessados via service_role key; ausência de política de expurgo formal; backup depende da infraestrutura de nuvem | Estabelecer política de retenção com período mínimo de 5 anos; implementar interface administrativa para visualização de registros arquivados; restringir acesso à service_role key | Preventivo / Detectivo | Média |
| ROP-03 | Operacional | Perda de integridade de documentos fiscais e fotografias armazenadas | Falha no serviço de armazenamento de arquivos; exclusão acidental de bucket; corrupção de dados em trânsito; referência órfã (registro aponta para arquivo inexistente) | Impossibilidade de comprovação de execução de serviço; fragilidade em prestação de contas; questionamento em auditoria | Baixa | Muito Alto | **Alto** | Upload via interface com vinculação direta à OS (campos `foto_antes`, `foto_depois`, `arquivo_orcamento`, `documentos_pagamento`); HTTPS para transmissão segura | Ausência de validação de integridade (hash/checksum) dos arquivos armazenados; não há verificação periódica de existência dos arquivos referenciados; ausência de política de versionamento de documentos; documentos fiscais podem ser sobrescritos sem histórico | Implementar validação de integridade (SHA-256) no upload; criar rotina de verificação periódica de links quebrados; implementar versionamento de documentos críticos; estabelecer política de backup específica para documentos fiscais | Preventivo / Detectivo | Alta |
| ROP-04 | Operacional | Erro na geração de relatórios PDF com dados inconsistentes | Divergência entre dados exibidos na interface e dados persistidos em `relatorios_execucao`/`relatorios_os`; falha na biblioteca jsPDF; dados de chamados vinculados desatualizados no momento da geração | Relatório oficial com valores divergentes dos registros do sistema; questionamento em auditoria; necessidade de retificação | Média | Alto | **Alto** | Persistência de snapshot (`dados_json`) no momento da geração; campos desnormalizados (`codigo_os`, `titulo_os`, `contrato_numero`) para consistência histórica; geração client-side com jsPDF | Snapshot em `dados_json` pode não incluir alterações realizadas após a geração; ausência de validação cruzada entre relatório gerado e dados atuais; não há mecanismo de invalidação de relatório obsoleto | Adicionar marca d'água "VERSÃO GERADA EM [data]" nos PDFs; implementar funcionalidade de regeneração de relatório com comparativo; registrar hash do conteúdo para detecção de adulteração | Detectivo | Média |
| ROP-05 | Operacional | Falha no sequencial de numeração de OS por regional | Condição de corrida (race condition) na tabela `regional_os_seq` em cenários de criação simultânea de OS na mesma regional | Duplicação de código de OS; inconsistência na identificação de ordens de serviço; confusão operacional | Baixa | Médio | **Baixo** | Tabela dedicada `regional_os_seq` com controle por regional; constraint `isOneToOne` na relação regional/sequencial | Ausência de lock explícito (SELECT FOR UPDATE) na operação de incremento; operação não é atômica em nível de aplicação | Encapsular incremento de sequencial em função PostgreSQL com lock explícito (SELECT FOR UPDATE); implementar constraint UNIQUE no campo `codigo` da tabela `ordens_servico` | Preventivo | Baixa |

### 2.4. Riscos de Segurança da Informação

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| RS-01 | Segurança | Escalonamento indevido de privilégios por manipulação da tabela `user_roles` | Exploração de vulnerabilidade em RLS; SQL injection via inputs não sanitizados; conluio entre usuários com perfis complementares | Acesso não autorizado a funcionalidades administrativas; manipulação de dados financeiros; comprometimento da integridade do sistema | Baixa | Alto | **Médio** | **[MITIGADO]** Tabela `user_roles` separada com RLS; funções `has_role`, `is_admin`, `is_manager`, `is_nacional` com `SECURITY DEFINER`; **trigger `trg_validate_role_hierarchy`** implementado com validação server-side da hierarquia (gestor_master→100, gestor_nacional→80, gestor_regional→60, fiscal_contrato→40). O trigger bloqueia INSERT/UPDATE quando o caller não possui autoridade sobre o role alvo. Operações de sistema (auth.uid() nulo) são permitidas para compatibilidade com o trigger `handle_new_user`. | Trigger `audit_role_change_trigger` já existente registra alterações, porém sem alerta automático para criação de perfis administrativos; trigger depende de `auth.uid()` que pode ser nulo em operações via service_role key (Edge Functions) | Implementar alerta automático para criação de perfis gestor_master/gestor_nacional; avaliar restrição adicional para operações via service_role key | Preventivo / Detectivo | Média |
| RS-02 | Segurança | Acesso não autorizado a documentos fiscais e fotografias de serviços | Configuração inadequada de políticas de acesso ao storage; URL de arquivo previsível ou sem expiração; compartilhamento indevido de links | Vazamento de documentos fiscais sensíveis; exposição de dados de fornecedores; violação de sigilo contratual | Média | Alto | **Alto** | HTTPS para transmissão; autenticação obrigatória para acesso ao sistema; RLS nas tabelas que referenciam os arquivos | Ausência de políticas de acesso específicas no bucket de armazenamento; URLs de arquivos podem ser acessadas diretamente sem validação de sessão; não há expiração de URLs de acesso; ausência de watermark em documentos sensíveis | Configurar políticas de acesso no storage vinculadas ao RLS das tabelas; implementar URLs assinadas com expiração (signed URLs); adicionar watermark com identificação do usuário em downloads de documentos fiscais; registrar logs de acesso a documentos | Preventivo / Detectivo | Alta |
| RS-03 | Segurança | Invocação não autenticada de Edge Functions críticas | Configuração `verify_jwt = false` nas Edge Functions do sistema; endpoints expostos publicamente | Importação de dados adulterados; envio de e-mails fraudulentos em nome do sistema | Baixa | Alto | **Médio** | **[MITIGADO PARCIALMENTE]** As 3 Edge Functions críticas (`create-contract-user`, `delete-user`, `import-csv`) implementam verificação de identidade via `getClaims(token)` e validação de role server-side (apenas `gestor_master`/`gestor_nacional` para `delete-user` e `import-csv`; 5 roles permitidos para `create-contract-user`). Funções de notificação (`notify-os-transition`, `notify-preposto`, `send-os-execucao`, `send-auth-email`) validam Authorization header. | Funções de notificação não verificam role do chamador (apenas autenticação); ausência de rate limiting; `verify_jwt = false` no config.toml significa que a proteção depende da implementação manual em cada função; ausência de validação de origem (CORS permissivo) | Implementar rate limiting nas Edge Functions; restringir CORS para domínios autorizados; adicionar verificação de role nas funções de notificação; considerar implementar API Gateway com throttling | Preventivo | Média |
| RS-04 | Segurança | Comprometimento de credenciais de usuário | Senha fraca; compartilhamento de credenciais; ausência de MFA; ataque de força bruta | Acesso indevido ao sistema com perfil do usuário comprometido; manipulação de dados; ações fraudulentas sob identidade alheia | Média | Alto | **Alto** | Autenticação por e-mail e senha; obrigatoriedade de alteração de senha no primeiro acesso (perfil terceirizado); controle de usuários ativos/inativos | Ausência de autenticação multifator (MFA); não há política de complexidade de senha configurada; não há bloqueio após tentativas falhas; não há expiração periódica de senha; primeiro acesso sem troca de senha obrigatória para perfis internos | Implementar MFA para perfis administrativos (gestor_master, gestor_nacional); configurar política de complexidade de senha; implementar bloqueio temporário após 5 tentativas falhas; estender obrigatoriedade de troca de senha no primeiro acesso para todos os perfis | Preventivo | Alta |
| RS-05 | Segurança | Vazamento de dados por falha em Row Level Security | Política de RLS mal configurada permitindo acesso cross-regional; bypass de RLS via função com `SECURITY DEFINER` inadequada; nova tabela criada sem RLS | Exposição de dados operacionais de outras regionais; violação do princípio de necessidade de conhecer; comprometimento da segregação de dados | Baixa | Alto | **Médio** | RLS habilitado em todas as tabelas; políticas segmentadas por perfil e regional; funções auxiliares com `SECURITY DEFINER` e `search_path` explícito; views com `security_invoker = on` | Complexidade das políticas de RLS (múltiplas condições aninhadas) dificulta auditoria; ausência de testes automatizados de RLS; novas tabelas podem ser criadas sem RLS inadvertidamente; políticas RESTRICTIVE (não PERMISSIVE) exigem atenção na combinação | Implementar suite de testes automatizados para validação de RLS por perfil; criar checklist obrigatório para criação de novas tabelas; realizar auditoria periódica (trimestral) das políticas de RLS; documentar matriz de acesso esperada vs. implementada | Detectivo / Preventivo | Alta |
| RS-06 | Segurança | Exposição de chave anônima (anon key) do banco de dados | Chave pública embutida no código-fonte do frontend; repositório acessível a terceiros | Tentativa de acesso direto à API REST do banco; scanning de endpoints; tentativa de bypass de RLS | Média | Médio | **Médio** | RLS protege todas as tabelas independente da chave utilizada; chave anon tem permissões limitadas; autenticação obrigatória para operações de escrita | Chave anon é pública por design mas pode ser utilizada para enumeração de endpoints; ausência de rate limiting na API REST; possibilidade de ataques de enumeração de dados | Implementar rate limiting na API REST; configurar CORS restritivo para domínios autorizados; monitorar padrões de acesso anômalos; considerar rotação periódica da chave anon | Detectivo | Média |

### 2.5. Riscos de Conformidade Administrativa

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| RC-01 | Conformidade | Insuficiência da trilha de auditoria para fins de prestação de contas | Tabela `audit_logs` não captura todas as operações relevantes; triggers de auditoria não cobrem todas as tabelas críticas; dados de auditoria insuficientes para reconstrução de eventos | Impossibilidade de rastreamento completo de operações financeiras; questionamento em processo de auditoria; fragilidade probatória | Média | Médio | **Médio** | **[MITIGADO]** Tabela `audit_logs` com campos action, table_name, record_id, old_data, new_data, user_id, description; triggers automáticos para eventos críticos; retenção indefinida de logs. **Tabela configurada como append-only**: política de DELETE removida — nenhum usuário, incluindo gestor_master, pode excluir registros de auditoria via API. Políticas de UPDATE inexistentes. Apenas INSERT é permitido (`WITH CHECK (true)`). | Não há garantia de que todas as tabelas possuem triggers de auditoria; campo `user_id` pode ser nulo em operações de sistema; registros ainda podem ser excluídos via acesso direto ao banco (service_role key) | Revisar e garantir triggers de auditoria em todas as tabelas com dados financeiros; implementar assinatura digital nos registros de auditoria; criar relatório periódico de integridade dos logs; restringir acesso à service_role key | Detectivo / Preventivo | Média |
| RC-02 | Conformidade | Descumprimento de requisitos da LGPD na gestão de dados pessoais | Armazenamento de dados pessoais (nome, e-mail, telefone) sem consentimento explícito documentado; ausência de mecanismo de anonimização; retenção indefinida de dados | Sanções administrativas; questionamento do Encarregado de Dados (DPO); dano reputacional | Média | Alto | **Alto** | Política de Privacidade documentada (PRIVACY_POLICY.md); coleta limitada a dados funcionais; finalidade restrita a atividades institucionais; dados não compartilhados com terceiros para fins comerciais | Ausência de mecanismo de consentimento explícito na interface; não há funcionalidade de portabilidade de dados; ausência de procedimento formal de anonimização para dados de usuários inativos; retenção indefinida sem justificativa documentada | Implementar termo de aceite na primeira autenticação; criar funcionalidade de exportação de dados pessoais (portabilidade); estabelecer política de retenção com prazos definidos; implementar anonimização automática para perfis inativos após período determinado | Preventivo | Alta |
| RC-03 | Conformidade | Ausência de formalização do processo de homologação do sistema | Sistema desenvolvido e implantado sem processo formal de homologação por autoridade competente; ausência de termo de aceite institucional | Questionamento sobre legitimidade do uso do sistema; ausência de respaldo administrativo para decisões baseadas no sistema; fragilidade em processos de responsabilização | Média | Médio | **Médio** | Documentação técnica abrangente; PRD formalizado; sistema em uso operacional | Ausência de portaria ou ato normativo que formalize a adoção do sistema; não há registro de homologação por área de TI; ausência de termo de responsabilidade para administradores | Elaborar minuta de portaria para formalização do SIMP; obter parecer técnico da área de TI; registrar termo de aceite com responsáveis por regional; documentar processo de homologação | Preventivo | Média |

### 2.6. Riscos Tecnológicos

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| RT-01 | Tecnológico | Dependência excessiva de funções serverless (Edge Functions) para operações críticas | Concentração de lógica de negócio crítica em Edge Functions (criação de usuários, exclusão, notificações, importação CSV); ambiente serverless com limites de execução | Falha silenciosa em operações críticas; timeout em operações de longa duração (importação CSV); inconsistência entre estado do banco e estado esperado | Média | Médio | **Médio** | 8 Edge Functions dedicadas com responsabilidades segregadas; monitoramento via logs; funções com escopo definido; **[ATUALIZAÇÃO v1.1]** validação de identidade (`getClaims`) e verificação de role server-side; **[ATUALIZAÇÃO v1.6]** Retry automático com backoff exponencial (até 2 retries, delays de 1s/2s/4s); Circuit breaker por função (abre após 5 falhas consecutivas, tenta reabrir após 60s); Health check automatizado via cron job a cada 15 minutos (`check-function-health`); Dashboard de monitoramento com KPIs, gráficos de latência/sucesso e tabela de erros recentes; Alertas por e-mail via Resend quando taxa de falha excede limiar configurável; Tabela `edge_function_logs` com telemetria completa; Wrapper `monitoredInvoke` instrumentando todas as chamadas | Importação CSV pode exceder limites de memória/tempo do runtime serverless | Migrar operações de longa duração (importação CSV) para processamento assíncrono com fila | Preventivo / Detectivo | Média |
| RT-02 | Tecnológico | Obsolescência de dependências de terceiros (bibliotecas e frameworks) | Ecossistema JavaScript/React com ciclo rápido de atualizações; dependências com manutenção descontinuada; vulnerabilidades de segurança em versões desatualizadas | Vulnerabilidades de segurança não corrigidas; incompatibilidade entre bibliotecas; degradação de performance; impossibilidade de atualização incremental | Média | Médio | **Médio** | 50+ dependências com versionamento semântico; build tool moderno (Vite); TypeScript para detecção de incompatibilidades | Ausência de ferramenta de monitoramento de vulnerabilidades (Dependabot, Snyk); não há política de atualização periódica de dependências; dependência de bibliotecas com manutenção por comunidade (ex: xlsx 0.18.5) | Implementar monitoramento automatizado de vulnerabilidades em dependências; estabelecer ciclo trimestral de atualização de dependências; identificar e documentar dependências críticas com plano de substituição | Preventivo | Média |
| RT-03 | Tecnológico | Degradação de performance em consultas com RLS complexo | Políticas de RLS com múltiplos subselects aninhados (até 4 níveis de profundidade em algumas tabelas); crescimento do volume de dados sem otimização correspondente | Tempo de resposta elevado para usuários; timeout em consultas complexas (dashboard, relatórios); experiência de uso degradada | Média | Médio | **Médio** | Cache de queries via TanStack React Query; lazy loading de componentes; índices em colunas críticas; views otimizadas | Políticas de RLS executam subqueries em cada acesso (ex: `get_user_regional_ids` chamada múltiplas vezes por consulta); ausência de monitoramento de performance de queries; não há plano de capacity planning | Realizar análise de EXPLAIN ANALYZE nas queries críticas; otimizar funções de RLS com caching de resultado (session-level); implementar monitoramento de queries lentas (pg_stat_statements); considerar materialização parcial para consultas de dashboard | Detectivo / Corretivo | Média |
| RT-04 | Tecnológico | Falha na geração de relatórios PDF em dispositivos com recursos limitados | Geração client-side via jsPDF com processamento intensivo de dados, imagens e formatação; dispositivos móveis ou computadores antigos com memória limitada | Falha silenciosa na geração; relatório corrompido; travamento do navegador; perda de dados de sessão | Média | Médio | **Médio** | Geração via jsPDF com snapshot de dados; interface responsiva; lazy loading | Processamento inteiramente client-side sem fallback server-side; imagens (fotos antes/depois) carregadas integralmente na memória; ausência de indicador de progresso para operações longas; não há validação de recursos disponíveis antes da geração | Implementar geração de PDF server-side como fallback; adicionar indicador de progresso; implementar compressão de imagens antes da inclusão no PDF; validar tamanho total dos dados antes de iniciar geração | Corretivo | Baixa |

### 2.7. Riscos de Continuidade do Negócio

| ID | Categoria | Evento de Risco | Causa Provável | Impacto Potencial | Probabilidade | Impacto | Nível de Risco | Controles Existentes | Vulnerabilidades Identificadas | Ação de Mitigação Recomendada | Tipo de Controle | Prioridade |
|----|-----------|----------------|----------------|-------------------|---------------|---------|----------------|---------------------|-------------------------------|-------------------------------|-----------------|------------|
| RCN-01 | Continuidade | Indisponibilidade prolongada do sistema por falha na infraestrutura de nuvem | Incidente no provedor de infraestrutura (Lovable Cloud); falha de região (data center); interrupção de serviço de DNS; expiração de certificado SSL/TLS | Paralisação completa das operações de manutenção predial informatizadas; retorno a controles manuais (planilhas); perda de produtividade; atraso em execução contratual | Baixa | Muito Alto | **Alto** | Infraestrutura gerenciada em nuvem com alta disponibilidade; deploy contínuo com rollback automático; HTTPS com TLS 1.3; domínio customizado (simp-prf.lovable.app) | Dependência de provedor único (Lovable Cloud); ausência de plano de contingência formal para operação offline; ausência de SLA formalizado com o provedor; não há simulação periódica de disaster recovery | Elaborar Plano de Continuidade de Negócios (PCN) formal; estabelecer SLA com o provedor; criar procedimento de operação offline (formulários em papel / planilhas modelo); realizar simulação anual de disaster recovery; manter backup exportável dos dados críticos | Preventivo / Corretivo | Alta |
| RCN-02 | Continuidade | Perda de dados por falha em backup ou ausência de restore testado | Falha no sistema automatizado de backup; corrupção de backup; impossibilidade de restore em tempo hábil; ausência de teste de restore periódico | Perda irreversível de dados operacionais e financeiros; impossibilidade de reconstituição do histórico; impacto severo em processos de auditoria | Baixa | Muito Alto | **Alto** | Backup automatizado com redundância geográfica (infraestrutura do provedor); criptografia AES-256 em repouso; dump de schema disponível (`public/dump-schema.sql`) | Ausência de teste periódico de restore; não há RTO (Recovery Time Objective) e RPO (Recovery Point Objective) definidos; dump-schema é apenas estrutura, não inclui dados; ausência de backup lógico periódico exportável | Definir e documentar RTO e RPO para o sistema; implementar teste de restore trimestral; criar rotina de backup lógico (pg_dump) exportável; manter cópia do backup em localidade diferente do provedor primário | Preventivo / Detectivo | Alta |
| RCN-03 | Continuidade | Lock-in tecnológico com impossibilidade de migração | Dependência profunda do ecossistema Lovable Cloud (autenticação, storage, Edge Functions, API REST automática); ausência de camada de abstração | Impossibilidade de migração para outro provedor em caso de descontinuidade do serviço; perda de autonomia tecnológica; risco de aumento de custos sem alternativa | Média | Alto | **Alto** | Código-fonte versionado em Git; PostgreSQL como engine (portável); documentação técnica abrangente; schema SQL disponível | Integração profunda com APIs proprietárias do provedor; Edge Functions com runtime específico; autenticação acoplada ao provedor; ausência de camada de abstração para serviços de infraestrutura; URLs de storage vinculadas ao provedor | Documentar todas as dependências específicas do provedor; manter exportação periódica do schema + dados; implementar camada de abstração para serviços críticos (auth, storage); avaliar periodicamente alternativas de hospedagem; manter documentação de procedimento de migração | Preventivo | Alta |

---

## 3. Análise Consolidada

### 3.1. Distribuição por Nível de Risco

| Nível de Risco | Quantidade | Percentual |
|----------------|------------|------------|
| Crítico | 2 | 7,7% |
| Alto | 15 | 57,7% |
| Médio | 8 | 30,8% |
| Baixo | 1 | 3,8% |
| **Total** | **26** | **100%** |

### 3.2. Distribuição por Categoria

| Categoria | Quantidade | Riscos Críticos | Riscos Altos |
|-----------|------------|-----------------|--------------|
| Estratégico | 3 | 1 | 2 |
| Orçamentário | 4 | 1 | 2 |
| Operacional | 5 | 0 | 3 |
| Segurança da Informação | 6 | 0 | 2 |
| Conformidade Administrativa | 3 | 0 | 1 |
| Tecnológico | 4 | 1 | 0 |
| Continuidade do Negócio | 3 | 0 | 3 |
| **Total** | **28** | **2** | **13** |

### 3.3. Distribuição por Tipo de Controle Recomendado

| Tipo de Controle | Quantidade |
|------------------|------------|
| Preventivo | 12 |
| Detectivo | 8 |
| Corretivo | 4 |
| Combinado (Prev. + Det.) | 4 |

---

## 4. Top 2 Riscos Críticos

| Posição | ID | Evento de Risco | Justificativa da Criticidade |
|---------|-----|----------------|------------------------------|
| **1º** | **RT-01** | Dependência excessiva de Edge Functions | A concentração de operações críticas (criação de usuários, notificações, importação de dados) em ambiente serverless sem mecanismos de resiliência (retry, circuit breaker, monitoramento) cria um ponto de falha sistêmico que afeta múltiplos processos simultaneamente. |
| **2º** | **RE-01** | Dependência de desenvolvedor único | O risco de paralisação total da evolução e manutenção do sistema por concentração de conhecimento técnico em um único profissional é classificado como crítico pela combinação de alta probabilidade (fato estrutural) com impacto institucional severo. |

> **Nota v1.1:** O risco **RS-03** (Invocação não autenticada de Edge Functions) foi reclassificado de **Crítico** para **Médio** após implementação de `getClaims()` + validação de role server-side.
> 
> **Nota v1.2:** O risco **RS-01** (Escalonamento de privilégios) foi reclassificado de **Alto** para **Médio** após implementação do trigger `trg_validate_role_hierarchy`.
>
> **Nota v1.3:** O risco **RC-01** (Trilha de auditoria) foi reclassificado de **Alto** para **Médio** após tornar `audit_logs` append-only (remoção da política de DELETE).
>
> **Nota v1.4:** O risco **ROP-02** (Exclusão indevida de dados históricos) foi reclassificado de **Crítico** para **Alto** após implementação de soft delete (`deleted_at`) nas tabelas `ordens_servico`, `chamados` e `contratos`, com remoção das políticas de DELETE via RLS.

---

## 5. Recomendações Estratégicas para os Próximos 12 Meses

### 5.1. Ações Imediatas (0-3 meses)

1. ~~**Habilitar verificação JWT nas Edge Functions críticas**~~ ✅ **CONCLUÍDO** — As funções `create-contract-user`, `delete-user` e `import-csv` agora utilizam `getClaims(token)` para validação de identidade e verificação de role server-side (`gestor_master`/`gestor_nacional` para `delete-user` e `import-csv`).
2. ~~**Implementar trigger de validação server-side**~~ ✅ **CONCLUÍDO** — Trigger `trg_validate_role_hierarchy` implementado na tabela `user_roles`, validando hierarquia de perfis em INSERT e UPDATE (RS-01).
3. ~~**Tornar tabela `audit_logs` append-only**~~ ✅ **CONCLUÍDO** — Política de DELETE removida, tabela agora é append-only (RC-01).
4. ~~**Implementar soft delete**~~ ✅ **CONCLUÍDO** — Campo `deleted_at` adicionado às tabelas `ordens_servico`, `chamados` e `contratos`. Políticas de DELETE removidas. View `contratos_saldo` atualizada (ROP-02).

### 5.2. Ações de Curto Prazo (3-6 meses)

5. **Desenvolver plano de contingência técnica**, incluindo identificação de profissional backup e transferência de conhecimento (RE-01).
6. **Implementar monitoramento de Edge Functions** com alertas de falha, taxa de sucesso e métricas de latência (RT-01, ROP-01).
7. **Configurar políticas de acesso ao storage** com URLs assinadas e expiração para documentos fiscais (RS-02).
8. **Definir e documentar RTO/RPO** e realizar primeiro teste de restore (RCN-02).
9. **Implementar mecanismo de retry** com backoff exponencial para notificações por e-mail (ROP-01).

### 5.3. Ações de Médio Prazo (6-12 meses)

10. **Implementar suite de testes automatizados de RLS** validando acesso por perfil em todas as tabelas (RS-05).
11. **Elaborar Plano de Continuidade de Negócios (PCN)** formal com procedimentos de operação offline (RCN-01).
12. **Implementar reconciliação automatizada** entre views de saldo e registros-fonte (RO-01, RO-04).
13. **Formalizar adoção do sistema** por ato normativo (portaria) com designação de responsáveis (RC-03).
14. **Implementar MFA** para perfis administrativos (gestor_master, gestor_nacional) (RS-04).
15. **Documentar procedimento de migração** e manter exportação periódica completa dos dados (RCN-03).

---

## 6. Avaliação do Nível de Maturidade de Gestão de Riscos

### 6.1. Avaliação por Dimensão

| Dimensão | Nível Atual | Observação |
|----------|-------------|------------|
| **Controle de Acesso** | Avançado | Implementação robusta de RLS com 7 perfis hierárquicos, funções auxiliares com SECURITY DEFINER e segregação por regional. **[ATUALIZAÇÃO v1.2]** Trigger `trg_validate_role_hierarchy` implementado para validação server-side da hierarquia de atribuição de perfis, eliminando dependência exclusiva do frontend. |
| **Trilha de Auditoria** | Avançado | Tabela dedicada com registro de operações críticas. **[ATUALIZAÇÃO v1.3]** Tabela `audit_logs` configurada como append-only (política de DELETE removida). **[ATUALIZAÇÃO v1.4]** Soft delete implementado nas tabelas `ordens_servico`, `chamados` e `contratos`, eliminando risco de perda irreversível de dados históricos. |
| **Integridade Financeira** | Intermediário | Bloqueio automático por saldo com 4 níveis hierárquicos, porém vulnerável a race conditions e sem reconciliação automatizada. Views atendem ao propósito mas sem teste de consistência. |
| **Segurança de Infraestrutura** | Intermediário | HTTPS/TLS implementado, criptografia em repouso. **[ATUALIZAÇÃO v1.1]** Edge Functions críticas possuem autenticação via `getClaims()` e verificação de role server-side. Lacunas remanescentes: ausência de MFA, storage sem políticas granulares de acesso, funções de notificação sem verificação de role. |
| **Continuidade de Negócios** | Básico | Dependência de infraestrutura gerenciada sem SLA formal, PCN ausente, teste de restore não realizado, procedimento de operação offline inexistente. |
| **Governança** | Básico | Documentação técnica abrangente, mas ausência de formalização por ato normativo, comitê gestor informal, e processo de gestão de demandas não estruturado. |

### 6.2. Classificação Geral

**Nível de Maturidade: INTERMEDIÁRIO (em transição para Avançado)**

O SIMP-PRF demonstra maturidade técnica significativa em controle de acesso e integridade de dados, com implementação de RLS abrangente, segregação por perfil e regional, e mecanismos de bloqueio automático. A segurança de infraestrutura foi elevada com a implementação de autenticação e autorização server-side nas Edge Functions críticas (v1.1). Contudo, persistem lacunas em continuidade de negócios (ausência de PCN e testes de restore) e governança formal (ausência de ato normativo de adoção).

A concentração de conhecimento técnico em desenvolvedor único constitui o principal risco estrutural, cuja materialização comprometeria simultaneamente a evolução, a manutenção e a segurança do sistema.

A implementação das recomendações estratégicas propostas elevaria o sistema ao nível **Avançado** de maturidade de gestão de riscos, compatível com as exigências de governança aplicáveis a sistemas de informação em órgãos da Administração Pública Federal.

---

_Documento elaborado conforme metodologia de avaliação qualitativa de riscos, com abordagem compatível com práticas reconhecidas de gestão de riscos no setor público._

**Versão:** 1.5  
**Data:** 28/02/2026  
**Responsável pela Elaboração:** Daniel Nunes de Ávila  
**Próxima Revisão Programada:** 28/08/2026 (semestral)

### Histórico de Revisões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 28/02/2026 | Elaboração inicial com 28 riscos em 7 categorias |
| 1.1 | 28/02/2026 | Reclassificação de RS-03 (Crítico → Médio) após implementação de `getClaims()` + validação de role nas Edge Functions. Top 5 → Top 4. Segurança de Infraestrutura: Básico → Intermediário. Recomendação 5.1.1 concluída. |
| 1.2 | 28/02/2026 | Reclassificação de RS-01 (Alto → Médio) após implementação do trigger `trg_validate_role_hierarchy` na tabela `user_roles`. Top 4 → Top 3. Recomendação 5.1.2 concluída. Controle de Acesso atualizado para refletir validação server-side da hierarquia. |
| 1.3 | 28/02/2026 | Reclassificação de RC-01 (Alto → Médio) após tornar `audit_logs` append-only (remoção da política de DELETE). Recomendação 5.1.3 concluída. |
| 1.4 | 28/02/2026 | Reclassificação de ROP-02 (Crítico → Alto) após implementação de soft delete (`deleted_at`) nas tabelas `ordens_servico`, `chamados` e `contratos`. Políticas de DELETE removidas via RLS. View `contratos_saldo` atualizada. Top 3 → Top 2. Trilha de Auditoria: Intermediário → Avançado. Recomendação 5.1.4 concluída. Todas as 4 ações imediatas (5.1) concluídas. |
| 1.5 | 28/02/2026 | Implementação de monitoramento de Edge Functions (RT-01, ROP-01): tabela `edge_function_logs` para registro de execuções; wrapper `monitoredInvoke` aplicado a todas as 8 Edge Functions; dashboard de monitoramento com KPIs, gráficos e tabela de status na aba Gestão; Edge Function `check-function-health` para verificação periódica com alertas por e-mail configuráveis (limiar, janela, destinatários). Recomendação 5.2.2 concluída. |
