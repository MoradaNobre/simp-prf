# 📋 Guia de Atualização de Documentação — SIMP-PRF

**Versão:** 1.0  
**Data de Criação:** 28/02/2026  
**Responsável:** Daniel Nunes de Ávila

---

## 1. Objetivo

Este guia padroniza o processo de atualização dos documentos de referência do SIMP, garantindo:

- Consistência entre os documentos
- Rastreabilidade de todas as alterações
- Histórico de versões completo (local em cada documento + CHANGELOG centralizado)

---

## 2. Documentos Gerenciados

| # | Documento | Caminho | Espelho público | Conteúdo |
|---|-----------|---------|-----------------|----------|
| 1 | **TECHNICAL_DOCS.md** | `public/TECHNICAL_DOCS.md` | Sim | Arquitetura, segurança, modelo de dados, edge functions |
| 2 | **PRD.md** | `PRD.md` + `public/PRD.md` | Sim | Requisitos funcionais, fluxos, perfis, governança |
| 3 | **SPEC.md** | `SPEC.md` | Não | Especificação funcional detalhada (UI, fluxos, campos) |
| 4 | **REGRAS_NEGOCIO.md** | `REGRAS_NEGOCIO.md` | Não | Catálogo de regras de negócio numeradas (RN-XXX) |
| 5 | **PRIVACY_POLICY.md** | `PRIVACY_POLICY.md` + `public/PRIVACY_POLICY.md` | Sim | Política de privacidade e LGPD |

> **Nota:** Documentos com espelho público devem ser atualizados em ambos os caminhos.

---

## 3. Quando Atualizar

Atualizar a documentação sempre que ocorrer:

- ✅ Nova funcionalidade ou módulo implementado
- ✅ Alteração em regras de negócio existentes
- ✅ Novo perfil de usuário ou alteração de permissões
- ✅ Adição/remoção de tabelas, colunas ou views no banco de dados
- ✅ Nova edge function criada ou removida
- ✅ Alteração no fluxo de status de OS ou Chamados
- ✅ Novo tipo de demanda, tipo de serviço ou enum adicionado
- ✅ Mudanças em políticas de segurança ou RLS
- ✅ Alterações em dados coletados (impacto LGPD)

---

## 4. Checklist de Atualização por Documento

### 4.1 TECHNICAL_DOCS.md

- [ ] Seção 1.3 — Componentes Técnicos (nova lib, ferramenta?)
- [ ] Seção 2.1 — Perfis de Usuário (novo perfil, permissão alterada?)
- [ ] Seção 4.1 — Tabelas Principais (nova tabela, coluna, view?)
- [ ] Seção 4.2 — Fluxo de Status (novo status adicionado?)
- [ ] Seção 6.x — Funcionalidades Principais (novo módulo, campo, comportamento?)
- [ ] Seção 7 — Edge Functions (nova função, removida?)
- [ ] Versão e data do cabeçalho
- [ ] Tabela de Histórico de Versões (nova linha)

### 4.2 PRD.md

- [ ] Seção 1.1 — Propósito (mudança de escopo?)
- [ ] Seção 2 — Perfis e Permissões (alteração de acesso?)
- [ ] Seção 6+ — Requisitos Funcionais (RF-XXX novo ou alterado?)
- [ ] Seção de Governança e Bloqueios (novo nível?)
- [ ] Versão e data do cabeçalho
- [ ] Tabela de Histórico de Versões (nova linha)

### 4.3 SPEC.md

- [ ] Seções de módulos (novo campo, fluxo, tela?)
- [ ] Permissões por perfil (quem pode fazer o quê?)
- [ ] Validações de formulário (novos campos obrigatórios?)
- [ ] Fluxos de status e transições
- [ ] Versão e data do cabeçalho
- [ ] Histórico de Versões (nova linha)

### 4.4 REGRAS_NEGOCIO.md

- [ ] Nova regra adicionada? (RN-XXX, manter sequência numérica)
- [ ] Regra existente alterada? (atualizar texto, manter número)
- [ ] Regra removida? (marcar como [REVOGADA], não renumerar)
- [ ] Total de regras atualizado na descrição do histórico
- [ ] Versão e data do cabeçalho
- [ ] Histórico de Versões (nova linha)

### 4.5 PRIVACY_POLICY.md

- [ ] Seção 1.1 — Novos dados coletados? (tipo, campo, categoria)
- [ ] Seção 1.2 — Finalidade alterada?
- [ ] Seção 3 — Novos operadores de dados?
- [ ] Seção de Retenção — Novos tipos de dados?
- [ ] Seção de Direitos — Novos canais?
- [ ] Versão e data do cabeçalho
- [ ] Tabela de Histórico de Versões (nova linha)

---

## 5. Procedimento Padrão de Atualização

### Passo 1: Identificar impacto

Para cada alteração no sistema, verificar quais documentos são afetados:

| Tipo de Alteração | TECH | PRD | SPEC | RN | PRIV |
|-------------------|:----:|:---:|:----:|:--:|:----:|
| Novo módulo/funcionalidade | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Nova tabela/coluna no banco | ✅ | — | — | — | ⚠️ |
| Nova edge function | ✅ | — | — | — | — |
| Novo perfil de usuário | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alteração de permissão | — | ✅ | ✅ | ✅ | — |
| Novo tipo de demanda/enum | — | — | ✅ | ✅ | — |
| Alteração fluxo de status | ✅ | ✅ | ✅ | ✅ | — |
| Novo campo de dados pessoais | — | — | ✅ | — | ✅ |
| Alteração de UI apenas | — | — | ✅ | — | — |

> ✅ = Atualizar obrigatório | ⚠️ = Verificar se há impacto | — = Sem impacto

### Passo 2: Atualizar conteúdo

1. Editar as seções afetadas em cada documento
2. Incrementar a versão (minor para ajustes, major para novos módulos)
3. Atualizar data no cabeçalho

### Passo 3: Registrar histórico

1. Adicionar nova linha na tabela de **Histórico de Versões** de cada doc alterado
2. Adicionar entrada correspondente no **CHANGELOG.md** centralizado

### Passo 4: Sincronizar espelhos públicos

Se o documento possui espelho em `public/`:
- `PRD.md` → `public/PRD.md`
- `PRIVACY_POLICY.md` → `public/PRIVACY_POLICY.md`
- `TECHNICAL_DOCS.md` já é em `public/`

---

## 6. Formato do Histórico de Versões (Local)

Cada documento deve manter no final uma tabela no formato:

```markdown
## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| X.Y | DD/MM/AAAA | Descrição concisa da alteração |
```

---

## 7. Formato do CHANGELOG Centralizado

Ver arquivo `CHANGELOG.md` na raiz do projeto. Formato:

```markdown
## [Data] — vX.Y

### Documento(s) Alterado(s)
- **NOME_DOC.md** (vA.B → vC.D): Descrição da alteração

### Motivação
Breve contexto da mudança (feature, correção, compliance)
```

---

## 8. Comando de Atualização

Ao solicitar uma atualização de documentação ao Lovable, use:

> **"Atualizar documentação: [descrever a alteração realizada no sistema]"**

O Lovable seguirá este guia automaticamente:
1. Identificará os documentos impactados
2. Atualizará as seções relevantes de cada documento
3. Incrementará versões e datas
4. Adicionará entradas no histórico local de cada doc
5. Atualizará o CHANGELOG.md centralizado
6. Sincronizará espelhos públicos quando aplicável

---

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 28/02/2026 | Versão inicial do guia de atualização de documentação |
