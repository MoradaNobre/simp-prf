# 📡 MCP Server — SIMP-PRF

**Versão:** 1.0  
**Data:** 08/03/2026  
**Protocolo:** Model Context Protocol (MCP) via HTTP Streamable

---

## 1. Visão Geral

O SIMP disponibiliza um servidor MCP (Model Context Protocol) que permite a ferramentas de IA externas — como **Claude Desktop**, **Cursor**, **Windsurf** e outros clientes compatíveis — consultar e interagir com os dados do sistema de forma segura e autenticada.

### URL do Servidor

```
https://qhqimpymsevtforpgghn.supabase.co/functions/v1/mcp-server
```

### Transporte

- **Protocolo:** HTTP Streamable (MCP Spec)
- **Método:** `POST`
- **Content-Type:** `application/json`
- **Accept:** `application/json, text/event-stream`

---

## 2. Autenticação

Todas as requisições exigem um **JWT válido** do sistema SIMP no header `Authorization`.

```
Authorization: Bearer <seu_token_jwt>
```

> ⚠️ O token deve ser obtido através do login no SIMP. As permissões RLS (Row Level Security) do banco de dados são respeitadas — cada usuário visualiza apenas os dados que seu perfil permite.

### Como obter o token

1. Faça login no SIMP normalmente
2. No console do navegador, execute:
   ```javascript
   const { data } = await supabase.auth.getSession();
   console.log(data.session.access_token);
   ```
3. Use o token retornado no header de autorização

---

## 3. Tools Disponíveis

### 3.1 `listar_ordens_servico`

Lista ordens de serviço com filtros opcionais.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `status` | string | Não | Filtrar por status: `aberta`, `orcamento`, `autorizacao`, `execucao`, `ateste`, `faturamento`, `pagamento`, `encerrada` |
| `prioridade` | string | Não | Filtrar por prioridade: `baixa`, `media`, `alta`, `urgente` |
| `regional_id` | string (UUID) | Não | UUID da regional para filtrar |
| `limite` | number | Não | Máximo de resultados (padrão: 50, máx: 200) |

**Retorno:** Lista de OS com campos `id`, `codigo`, `titulo`, `status`, `prioridade`, `tipo`, `data_abertura`, `regional_id`, `uop_id`, `contrato_id`, `valor_orcamento`.

---

### 3.2 `detalhes_os`

Retorna dados completos de uma Ordem de Serviço específica, incluindo custos, agendamentos e chamados vinculados.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `os_id` | string (UUID) | **Sim** | UUID da Ordem de Serviço |

**Retorno:** Objeto completo da OS com:
- Dados da OS (todos os campos)
- `regionais` — nome e sigla da regional
- `uops` — nome da UOP
- `contratos` — número e empresa do contrato
- `custos` — lista de custos vinculados
- `agendamentos` — lista de visitas agendadas
- `chamados_vinculados` — lista de chamados associados

---

### 3.3 `listar_chamados`

Lista chamados com filtros opcionais por status, regional e busca textual.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `status` | string | Não | Filtrar por status: `aberto`, `analisado`, `vinculado`, `cancelado` |
| `regional_id` | string (UUID) | Não | UUID da regional para filtrar |
| `busca` | string | Não | Busca textual no código, descrição ou tipo de demanda |
| `limite` | number | Não | Máximo de resultados (padrão: 50, máx: 200) |

**Retorno:** Lista de chamados ordenados por `gut_score` (decrescente) com campos `id`, `codigo`, `tipo_demanda`, `descricao`, `local_servico`, `prioridade`, `status`, `gut_score`, `created_at`, `regional_id`, `os_id`.

---

### 3.4 `listar_contratos`

Lista contratos com saldo, empresa, vigência e status.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `regional_id` | string (UUID) | Não | UUID da regional para filtrar |
| `status` | string | Não | Filtrar por status: `vigente`, `encerrado`, `suspenso` |
| `limite` | number | Não | Máximo de resultados (padrão: 50, máx: 200) |

**Retorno:** Lista de contratos com campos `id`, `numero`, `empresa`, `objeto`, `data_inicio`, `data_fim`, `valor_total`, `status`, `tipo_servico`, `regional_id`, dados da regional e **saldo calculado** (valor total, aditivos, custos e saldo disponível).

---

### 3.5 `dashboard_resumo`

Retorna indicadores agregados do sistema.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `regional_id` | string (UUID) | Não | UUID da regional para filtrar (padrão: todas acessíveis) |

**Retorno:**
```json
{
  "ordens_servico": {
    "total": 42,
    "por_status": {
      "aberta": 5,
      "execucao": 12,
      "encerrada": 25
    }
  },
  "chamados": {
    "total": 87,
    "por_status": {
      "aberto": 30,
      "analisado": 20,
      "vinculado": 37
    }
  },
  "contratos": {
    "total": 8,
    "por_status": {
      "vigente": 6,
      "encerrado": 2
    }
  },
  "orcamento": {
    "total_dotacao": 5000000,
    "total_creditos": 800000,
    "total_empenhos": 3200000,
    "saldo_disponivel": 2600000
  }
}
```

---

### 3.6 `criar_chamado`

Cria um novo chamado no sistema.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|:-----------:|-----------|
| `tipo_demanda` | string | **Sim** | Tipo da demanda (ex: elétrica, hidráulica, civil) |
| `descricao` | string | **Sim** | Descrição detalhada do problema |
| `local_servico` | string | **Sim** | Local onde o serviço será realizado |
| `regional_id` | string (UUID) | **Sim** | UUID da regional |
| `prioridade` | string | Não | Prioridade: `baixa`, `media` (padrão), `alta`, `urgente` |
| `uop_id` | string (UUID) | Não | UUID da UOP |
| `delegacia_id` | string (UUID) | Não | UUID da delegacia |

**Retorno:** Objeto completo do chamado criado, incluindo o `codigo` gerado automaticamente.

---

## 4. Configuração em Clientes MCP

### 4.1 Claude Desktop

Adicione ao arquivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "simp-prf": {
      "url": "https://qhqimpymsevtforpgghn.supabase.co/functions/v1/mcp-server",
      "headers": {
        "Authorization": "Bearer <seu_token_jwt>"
      }
    }
  }
}
```

### 4.2 Cursor

Adicione ao arquivo `.cursor/mcp.json` do projeto:

```json
{
  "mcpServers": {
    "simp-prf": {
      "url": "https://qhqimpymsevtforpgghn.supabase.co/functions/v1/mcp-server",
      "headers": {
        "Authorization": "Bearer <seu_token_jwt>"
      }
    }
  }
}
```

### 4.3 MCP Inspector (Testes)

Para testar interativamente:

```bash
npx @modelcontextprotocol/inspector
```

Configure a URL do servidor e o header de autorização na interface do Inspector.

---

## 5. Segurança

| Aspecto | Implementação |
|---------|---------------|
| **Autenticação** | JWT obrigatório em todas as requisições |
| **Autorização** | RLS do banco de dados aplicado automaticamente |
| **Escopo de dados** | Cada usuário vê apenas dados de suas regionais |
| **Limites** | Máximo de 200 registros por consulta |
| **Soft delete** | Registros excluídos logicamente são filtrados automaticamente |
| **CORS** | Habilitado para acesso de qualquer origem |

---

## 6. Exemplos de Uso com IA

### Exemplo 1: Resumo do dashboard

> **Prompt:** "Qual é o resumo atual do SIMP? Quantas OS estão abertas?"
>
> A IA chamará `dashboard_resumo` e apresentará os indicadores.

### Exemplo 2: Buscar chamados urgentes

> **Prompt:** "Liste os chamados com prioridade urgente que ainda estão abertos."
>
> A IA chamará `listar_chamados` com `status: "aberto"` e filtrará por prioridade urgente.

### Exemplo 3: Detalhes de uma OS

> **Prompt:** "Me dê os detalhes completos da OS-SPR-00042."
>
> A IA primeiro buscará a OS via `listar_ordens_servico` e depois chamará `detalhes_os` com o UUID encontrado.

### Exemplo 4: Criar chamado via IA

> **Prompt:** "Abra um chamado de manutenção elétrica na regional SPR, local: Posto PRF km 42."
>
> A IA chamará `criar_chamado` com os parâmetros extraídos do prompt.

---

## 7. Limitações Conhecidas

- O token JWT expira após o tempo configurado na autenticação (padrão: 1 hora)
- Operações de escrita estão limitadas a `criar_chamado` nesta versão
- Não há suporte a recursos MCP (resources) ou prompts — apenas tools
- O servidor não mantém estado entre requisições (stateless)

---

## Histórico de Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 08/03/2026 | Versão inicial com 6 tools: listar OS, detalhes OS, listar chamados, listar contratos, dashboard resumo e criar chamado |
