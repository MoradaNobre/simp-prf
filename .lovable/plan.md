

## MCP Server para o SIMP

Sim, é possível criar um MCP Server diretamente no Lovable. O servidor seria hospedado como uma backend function (Edge Function) e exporia ferramentas (tools) que permitem a qualquer cliente MCP compatível (como Claude Desktop, Cursor, etc.) consultar e interagir com os dados do SIMP.

### O que é possível expor via MCP

Ferramentas de leitura e escrita sobre os dados do sistema, por exemplo:

- **listar_ordens_servico** — buscar OS com filtros (status, regional, prioridade)
- **detalhes_os** — retornar dados completos de uma OS específica
- **listar_chamados** — buscar chamados com filtros
- **listar_contratos** — consultar contratos e saldos
- **criar_chamado** — abrir um chamado via MCP
- **dashboard_resumo** — retornar indicadores agregados (OS por status, orçamento, etc.)

### Implementação técnica

1. **Criar uma Edge Function** `supabase/functions/mcp-server/index.ts` usando a biblioteca `mcp-lite` (v0.10+) com roteamento Hono
2. **Definir as tools** com schemas de input/output para cada operação
3. **Autenticação**: validar JWT do usuário chamador para respeitar as permissões RLS existentes
4. **Transporte**: HTTP Streamable, acessível via URL pública da função

### Estrutura

```text
supabase/functions/mcp-server/
├── index.ts          # Servidor MCP com Hono + mcp-lite
└── deno.json         # Dependências (mcp-lite, hono)
```

### Considerações

- As tools respeitariam o RLS existente, usando o token do usuário autenticado
- O MCP Server ficaria disponível na URL da função e poderia ser conectado a qualquer cliente MCP
- Não requer API key adicional — usa a autenticação já existente do sistema

### Próximo passo

Antes de implementar, preciso definir quais tools você quer expor. Posso começar com um conjunto básico (listar OS, chamados, contratos e dashboard) e expandir depois.

