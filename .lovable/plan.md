

# SIMP-PRF — Sistema de Manutenção Predial da PRF

## Visão Geral
Sistema web responsivo para gestão completa da manutenção predial das unidades da Polícia Rodoviária Federal, cobrindo desde o cadastro de ativos até indicadores de desempenho.

---

## 1. Autenticação e Controle de Acesso
- Login por email/senha com 4 níveis de acesso: **Gestor Nacional**, **Gestor Regional**, **Fiscal de Contrato** e **Operador (Solicitante)**
- Cada nível verá apenas os dados e ações permitidos para seu perfil
- Gestor Nacional: visão completa de todas as regionais
- Gestor Regional: visão da sua regional e unidades subordinadas
- Fiscal de Contrato: gestão de contratos e acompanhamento de OS vinculadas
- Operador: abertura e acompanhamento das próprias OS

---

## 2. Módulo de Ativos (Cadastro Hierárquico)
- Estrutura em árvore: **Regional → Delegacia → UOP → Equipamento**
- Ficha de cada ativo com localização, dados técnicos, fotos e histórico de manutenção
- Geração de QR Code por ativo para identificação rápida em campo (escaneável pelo celular)
- Importação de dados reais via planilha para popular as unidades

---

## 3. Gestão de Ordens de Serviço (OS)
- Fluxo completo com os estados: **Aberta → Triagem → Em Execução → Encerrada**
- Upload de fotos de "antes e depois" na execução
- Campo de assinatura digital para encerramento da OS
- Vinculação da OS ao ativo (equipamento/unidade) e ao contrato correspondente
- Filtros por unidade, status, prioridade e período

---

## 4. Planos de Manutenção Preventiva (PMOC)
- Cadastro de planos com cronograma recorrente (mensal, trimestral, semestral, anual)
- Tipos pré-configurados: ar-condicionado, geradores, telhados, sistemas elétricos
- Geração automática de OS preventivas conforme o cronograma
- Painel de aderência ao plano (executado vs. planejado)

---

## 5. Gestão de Contratos e Custos
- Cadastro de contratos com terceirizadas (vigência, escopo, valores)
- Registro de custos por OS: peças e mão de obra
- Vinculação de OS ao contrato correspondente
- Acompanhamento de saldo e vigência dos contratos

---

## 6. Dashboard de Indicadores (KPIs)
Painel visual com gráficos em tempo real:
- **MTTR** — Tempo Médio de Reparo
- **Backlog** — Quantidade de chamados abertos/pendentes
- **Corretiva vs. Preventiva** — Proporção com meta visual de 30/70
- **Disponibilidade Operacional** — % de aptidão das unidades
- **Custo por m²** — Por unidade e por regional
- Filtros por regional, período e tipo de manutenção

---

## 7. Layout e Navegação
- Menu lateral (sidebar) com acesso a todos os módulos
- Design responsivo para uso em desktop e celular
- Paleta institucional (tons de azul/cinza, remetendo à identidade da PRF)
- Tabelas com busca, filtros e paginação em todos os módulos

---

## Backend
- Banco de dados com Supabase (Lovable Cloud) para todas as tabelas, autenticação e controle de acesso por RLS
- Armazenamento de fotos (OS antes/depois) via Supabase Storage

