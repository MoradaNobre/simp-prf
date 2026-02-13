

# Plano de Desenvolvimento Completo — SIMP-PRF

## Estado Atual
- Autenticacao (login/signup) funcionando com 4 niveis de acesso no banco
- Hierarquia de ativos importada (46 regionais com delegacias e UOPs)
- Paginas placeholder para OS, Preventiva, Contratos
- Dashboard com dados mockados (estaticos)
- Esquema de banco completo com RLS

## Funcionalidades a Implementar

---

### Fase 1: Infraestrutura de Storage e Hooks Compartilhados

**Banco de dados:**
- Criar bucket `os-fotos` no Supabase Storage para fotos de antes/depois
- Politicas de acesso: usuarios autenticados podem fazer upload; leitura publica

**Hooks compartilhados:**
- `useUserRole` — busca o papel do usuario logado na tabela `user_roles`
- `useRegionais`, `useDelegacias`, `useUops`, `useEquipamentos` — hooks reutilizaveis para selects

---

### Fase 2: Modulo de Ordens de Servico (Completo)

**Pagina `OrdensServico.tsx` — listagem real:**
- Substituir dados mock por query ao banco (`ordens_servico` com joins em `uops`)
- Filtros por status, prioridade, unidade e periodo (date range)
- Paginacao
- Badge de status e prioridade com cores

**Dialog `NovaOSDialog` — formulario de criacao:**
- Campos: titulo, descricao, tipo (corretiva/preventiva), prioridade, UOP (select hierarquico), equipamento (filtrado pela UOP)
- Upload de foto "antes" via Storage
- Codigo gerado automaticamente pelo trigger do banco

**Dialog `DetalhesOSDialog` — visualizacao e atualizacao:**
- Visualizar todos os dados da OS
- Transicao de status: Aberta -> Triagem -> Em Execucao -> Encerrada
- Upload de foto "depois" na execucao
- Campo de assinatura digital (canvas de desenho) para encerramento
- Registro de custos (pecas e mao de obra) vinculados a OS

---

### Fase 3: Dashboard com Dados Reais e Graficos

**KPIs calculados em tempo real:**
- OS Abertas: count de `ordens_servico` com status != encerrada
- Urgentes: count com prioridade = urgente
- Concluidas no mes: count com status = encerrada e data_encerramento no mes atual
- MTTR: media de (data_encerramento - data_abertura) das OS encerradas

**Graficos com Recharts:**
- Grafico de pizza/donut: Corretiva vs. Preventiva com meta 30/70
- Grafico de barras: OS por regional (top 10)
- Grafico de linha: evolucao mensal de OS abertas vs encerradas
- Card de disponibilidade operacional

**Filtros:**
- Por regional e periodo

---

### Fase 4: Manutencao Preventiva (PMOC)

**Pagina `Preventiva.tsx` — listagem:**
- Tabela com planos ativos: nome, categoria, frequencia, proxima execucao, UOP
- Indicador de aderencia (OS geradas vs planejadas)

**Dialog `NovoPlanoDialog`:**
- Campos: nome, categoria (ar_condicionado, gerador, etc), frequencia, UOP, descricao de atividades, data da proxima execucao

**Geracao automatica de OS:**
- Edge function `generate-preventive-os` que roda sob demanda (botao "Gerar OS do periodo")
- Verifica planos com `proxima_execucao <= hoje`, cria OS preventiva e atualiza proxima data

---

### Fase 5: Gestao de Contratos e Custos

**Pagina `Contratos.tsx` — listagem:**
- Tabela com contratos: numero, empresa, vigencia, valor, status, saldo consumido
- Indicador visual de vigencia (ativo/vencido/proximo do vencimento)

**Dialog `NovoContratoDialog`:**
- Campos: numero, empresa, objeto, data inicio/fim, valor total

**Detalhes do contrato:**
- Lista de OS vinculadas ao contrato
- Soma de custos (pecas + mao de obra) vs valor total do contrato
- Barra de progresso do saldo

---

### Fase 6: Ativos — Equipamentos e QR Code

**Cadastro de equipamentos:**
- Dialog para adicionar equipamento vinculado a uma UOP
- Campos: nome, categoria, marca, modelo, numero de serie, data instalacao

**QR Code:**
- Geracao automatica de QR Code (usando biblioteca JS) com link para a ficha do equipamento
- Botao para imprimir/baixar QR Code

**Ficha do ativo:**
- Pagina de detalhes da UOP/equipamento com historico de OS vinculadas

---

### Fase 7: Gestao de Usuarios e Perfis

**Pagina `Usuarios.tsx` (visivel apenas para gestor_nacional):**
- Lista de usuarios com nome, email, papel atual
- Alterar papel de um usuario (select com os 4 niveis)
- Rota `/usuarios` adicionada ao sidebar (condicional ao papel)

---

## Resumo Tecnico

| Item | Tipo | Arquivos |
|------|------|----------|
| Storage bucket | Migracao SQL | Nova migracao |
| useUserRole hook | Novo arquivo | `src/hooks/useUserRole.ts` |
| OS completo | Refatoracao + novos | `OrdensServico.tsx`, `NovaOSDialog.tsx`, `DetalhesOSDialog.tsx` |
| Dashboard real | Refatoracao | `Dashboard.tsx` |
| Preventiva completo | Refatoracao + novos | `Preventiva.tsx`, `NovoPlanoDialog.tsx` |
| Edge function preventiva | Novo | `supabase/functions/generate-preventive-os/index.ts` |
| Contratos completo | Refatoracao + novos | `Contratos.tsx`, `NovoContratoDialog.tsx` |
| Equipamentos + QR | Novos componentes | `EquipamentoDialog.tsx`, `QRCodeView.tsx` |
| Gestao usuarios | Nova pagina | `Usuarios.tsx` |
| Assinatura digital | Novo componente | `SignaturePad.tsx` |

A implementacao seguira a ordem das fases para garantir que dependencias sejam resolvidas primeiro (ex: storage antes de upload de fotos, hooks antes das paginas).

