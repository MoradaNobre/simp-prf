# 📝 CHANGELOG — Documentação SIMP-PRF

Registro centralizado de todas as alterações nos documentos de referência do sistema.

---

## [25/03/2026] — Revisão Orçamentária, QR Code Aprimorado, KPIs Orçamentários e Validações

### Documento(s) Alterado(s)
- **SPEC.md** (v2.0 → v2.1): Revisão orçamentária com anexo XLS obrigatório e bloqueio do fluxo da OS. QR Code com layout de manutenção (header, dados do ativo, texto instrucional). KPIs orçamentários revisados (Consumo OS, Saldo Empenhado, Saldo Cota). Visibilidade do histórico de OS para gestores regionais e fiscais. Máscara e validação de CPF.
- **REGRAS_NEGOCIO.md** (v2.0 → v2.1): Novas regras RN-234 a RN-248 (revisão orçamentária, QR Code, KPIs, CPF, visibilidade). Total: 248 regras
- **TECHNICAL_DOCS.md** (v1.9 → v2.0): Consumo OS via valor_orcamento, campos de ativo (tipo_equipamento, tombamento, numero_serie), QR Code com layout de manutenção
- **PRD.md** (v1.8 → v1.9): Novos requisitos de revisão orçamentária, KPIs revisados, QR Code aprimorado. 248 regras de negócio

### Motivação
Aprimoramento da revisão orçamentária com anexo obrigatório e bloqueio do fluxo. Redesign do QR Code para incluir informações de manutenção. Correção dos KPIs orçamentários para usar valor_orcamento das OS em vez de custos avulsos. Validação de CPF com máscara. Ampliação da visibilidade do histórico de OS.

---

## [24/03/2026] — Relatório IMR e Prazo de Execução no Relatório de OS

### Documento(s) Alterado(s)
- **SPEC.md** (v1.9 → v2.0): Nova seção 8.2.3 — Relatório IMR (motor de regras automáticas, cálculo de score, impacto financeiro, contraditório, PDF 11 seções). Prazo de execução no Relatório de Execução (PDF e e-mail). Menu renomeado para "Relatórios"
- **REGRAS_NEGOCIO.md** (v1.9 → v2.0): Novas regras RN-221 a RN-233 (Relatório IMR e prazo no Relatório de Execução). Total: 233 regras
- **TECHNICAL_DOCS.md** (v1.8 → v1.9): Tabela `relatorios_imr`, módulo de Relatórios atualizado com IMR e prazo de execução
- **PRD.md** (v1.7 → v1.8): Novos requisitos RF-REL-08 a RF-REL-13 (Relatório IMR e prazo de execução). 233 regras de negócio

### Motivação
Implementação do Relatório IMR (Instrumento de Medição de Resultado) com motor de regras automáticas que detecta falhas nas OS e calcula o score de desempenho da contratada. Inclusão do prazo de execução no Relatório de Execução (PDF e corpo do e-mail) para maior transparência com a empresa contratada.

---

## [24/03/2026] — Módulo de Ativos, QR Codes, Consolidação Sede Nacional e Badges Dinâmicos

### Documento(s) Alterado(s)
- **SPEC.md** (v1.8 → v1.9): Nova seção 12 — Ativos e QR Codes (cadastro hierárquico, QR Codes por UOP, consolidação da Sede Nacional). Badges dinâmicos de bloqueio na Autorização de OS
- **REGRAS_NEGOCIO.md** (v1.8 → v1.9): Novas regras RN-211 a RN-220 (Ativos, QR Codes, Sede Nacional, badges dinâmicos). Total: 220 regras
- **TECHNICAL_DOCS.md** (v1.7 → v1.8): Módulo de Ativos com QR Codes (seção 6.8), badges dinâmicos de bloqueio (seção 6.9), registro protegido da Sede Nacional
- **PRD.md** (v1.6 → v1.7): Atualização do escopo de Gestão de Ativos com QR Codes e Sede Nacional, 220 regras de negócio
- **PRIVACY_POLICY.md** (v1.5 → v1.6): Inclusão de dados de ativos prediais (QR Codes, hierarquia de unidades) nos dados funcionais coletados

### Motivação
Implementação do módulo de Ativos com geração de QR Codes para abertura rápida de chamados, consolidação do registro da Sede Nacional (eliminação de duplicidade), proteção contra exclusão acidental e badges dinâmicos para identificar o motivo específico do bloqueio na Autorização de OS.

---

## [06/03/2026] — Prazos obrigatórios e Agenda unificada

### Documento(s) Alterado(s)
- **SPEC.md** (v1.7 → v1.8): Prazos obrigatórios (`prazo_orcamento`, `prazo_execucao`) nas transições de OS. Seção 7 reescrita como "Agenda (Visitas e Prazos)" com calendário unificado, cards de resumo, abas e filtros
- **REGRAS_NEGOCIO.md** (v1.7 → v1.8): Novas regras RN-203 a RN-210 (prazos obrigatórios e agenda unificada). Total: 210 regras
- **TECHNICAL_DOCS.md** (v1.6 → v1.7): Registro dos campos de prazo e agenda unificada
- **PRD.md** (v1.5 → v1.6): Registro dos prazos obrigatórios e agenda unificada, 210 regras de negócio

### Motivação
Implementação de prazos obrigatórios para orçamento e execução de OS, com agenda unificada integrando visitas técnicas e prazos em um calendário mensal com indicadores de vencimento.

---

## [28/02/2026] — Aceite obrigatório de Termos e tipo de demanda Usina Solar

### Documento(s) Alterado(s)
- **TECHNICAL_DOCS.md** (v1.5 → v1.6): Aceite obrigatório de Termos de Uso e Política de Privacidade (`accepted_terms_at`), 10 tipos de demanda
- **PRD.md** (v1.4 → v1.5): Registro do aceite obrigatório e novo tipo de demanda, 202 regras de negócio
- **SPEC.md** (v1.6 → v1.7): Fluxo pós-login com dialog bloqueante de Termos, tipo "Usina Solar" na tabela de tipos de demanda
- **REGRAS_NEGOCIO.md** (v1.6 → v1.7): Novas regras RN-198 a RN-202 (aceite de termos e usina solar). Total: 202 regras
- **PRIVACY_POLICY.md** (v1.4 → v1.5): Mecanismo de aceite obrigatório com registro de timestamp

### Motivação
Conformidade com LGPD (aceite explícito) e ampliação dos tipos de demanda para manutenção de usinas solares.

---

## [28/02/2026] — Criação do processo de documentação

### Documento(s) Alterado(s)
- **DOCS_UPDATE_GUIDE.md** (v1.0): Guia de atualização de documentação criado
- **CHANGELOG.md** (v1.0): Changelog centralizado criado

### Motivação
Estabelecer processo padronizado de manutenção da documentação com rastreabilidade completa.

---

## [26/02/2026] — Módulo de Chamados

### Documento(s) Alterado(s)
- **TECHNICAL_DOCS.md** (v1.4 → v1.5): Inclusão do módulo de Chamados, tabela `chamados`, reestruturação de relatórios PDF com seção de chamados vinculados e Matriz GUT
- **PRD.md** (v1.3 → v1.4): Inclusão do fluxo funcional de Chamados (seção 6.0), sequência Chamado → OS, requisitos RF-CHM
- **SPEC.md** (v1.5 → v1.6): Inclusão do módulo de Chamados (seção 6A), reestruturação dos relatórios PDF com chamados vinculados
- **REGRAS_NEGOCIO.md** (v1.5 → v1.6): Inclusão das regras RN-184 a RN-197 (módulo de Chamados). Total: 197 regras
- **PRIVACY_POLICY.md** (v1.3 → v1.4): Inclusão de dados de chamados de manutenção nos dados funcionais coletados

### Motivação
Implementação do módulo de Chamados como etapa pré-OS, com análise GUT para priorização.

---

## [24/02/2026] — Fluxo Cartão Corporativo e Suprido

### Documento(s) Alterado(s)
- **SPEC.md** (v1.4 → v1.5): Fluxo abreviado do Cartão Corporativo (Ateste → Encerrada), permissões especiais do Suprido
- **REGRAS_NEGOCIO.md** (v1.4 → v1.5): Inclusão das regras RN-180 a RN-183 (fluxo abreviado e duplicação). Total: 183 regras

### Motivação
Simplificação do fluxo de OS para contratos de Cartão Corporativo.

---

## [24/02/2026] — Limites de Modalidade

### Documento(s) Alterado(s)
- **TECHNICAL_DOCS.md** (v1.3 → v1.4): Tabela `limites_modalidade`, 4 níveis de bloqueio, duplicação de contratos, edição inline de limites
- **SPEC.md** (v1.3 → v1.4): Limites de Modalidade (4º bloqueio), edição inline, duplicação de contratos Cartão Corporativo
- **REGRAS_NEGOCIO.md** (v1.3 → v1.4): Inclusão das regras RN-170 a RN-179 (limites e duplicação)
- **PRIVACY_POLICY.md** (v1.2 → v1.3): Inclusão de dados de limites de modalidade e duplicação de contratos

### Motivação
Controle preventivo da despesa com bloqueios automáticos por modalidade.

---

## [24/02/2026] — Perfil Suprido

### Documento(s) Alterado(s)
- **TECHNICAL_DOCS.md** (v1.2 → v1.3): Flag `is_suprido` na tabela `profiles`
- **SPEC.md** (v1.2 → v1.3): Inclusão do perfil Suprido como flag acumulável
- **REGRAS_NEGOCIO.md** (v1.2 → v1.3): Inclusão das regras RN-165 a RN-169
- **PRIVACY_POLICY.md** (v1.1 → v1.2): Inclusão da flag Suprido nos dados funcionais

### Motivação
Identificação do preposto do cartão corporativo como flag booleana acumulável.

---

## [24/02/2026] — Agenda de Visitas e UI

### Documento(s) Alterado(s)
- **TECHNICAL_DOCS.md** (v1.0 → v1.2): Módulo de Agenda de Visitas, tabela `agendamentos_visita`, refinamento de UI
- **SPEC.md** (v1.0 → v1.2): Inclusão do módulo de Agenda de Visitas, destaque visual do botão Agendar
- **REGRAS_NEGOCIO.md** (v1.0 → v1.2): Inclusão das regras RN-156 a RN-164
- **PRIVACY_POLICY.md** (v1.0 → v1.1): Inclusão de dados de agendamentos de visitas

### Motivação
Implementação do calendário de visitas técnicas vinculadas a OS.

---

## [16/02/2026] — Versão Inicial

### Documento(s) Alterado(s)
- **TECHNICAL_DOCS.md** (v1.0): Versão inicial da documentação técnica
- **PRD.md** (v1.0): Versão inicial do PRD
- **SPEC.md** (v1.0): Versão inicial da especificação funcional
- **REGRAS_NEGOCIO.md** (v1.0): Versão inicial do catálogo de regras
- **PRIVACY_POLICY.md** (v1.0): Versão inicial da política de privacidade

### Motivação
Criação da documentação base do SIMP-PRF.
