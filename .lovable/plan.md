

## Adaptar labels do formulário de Novo Chamado para Sede Nacional

### Problema
Quando o usuário seleciona a regional "Sede Nacional" (SEDE-NAC) no formulário de abertura de chamado, os campos continuam exibindo "Delegacia / Sede Regional" e "UOP / Anexo", o que não faz sentido para a sede nacional que usa "Diretoria" e "Anexo / Edifício".

### Solução
Detectar dinamicamente quando a regional selecionada (ou vinculada ao perfil) é a SEDE-NAC e trocar os labels dos campos hierárquicos.

### Mapeamento de labels

| Regional selecionada | Campo 2 (delegacia) | Campo 3 (uop) |
|---|---|---|
| Qualquer regional | "Delegacia / Sede Regional" | "UOP / Anexo" |
| SEDE-NAC | "Diretoria" | "Anexo / Edifício" |

### Arquivo a editar
**`src/components/chamados/NovoChamadoDialog.tsx`**

1. Importar `SEDE_NACIONAL_SIGLA` de `NovoAtivoDialog`
2. Adicionar lógica para identificar se a regional selecionada é a sede nacional (comparando a `sigla` da regional com `SEDE_NACIONAL_SIGLA`)
3. Criar variáveis `delegaciaLabel` e `uopLabel` que mudam conforme o contexto:
   - Se sede nacional: `"Diretoria"` e `"Anexo / Edifício"`
   - Caso contrário: `"Delegacia / Sede Regional"` e `"UOP / Anexo"`
4. Substituir os `<Label>` estáticos pelos labels dinâmicos
5. Atualizar os placeholders dos `<Select>` correspondentes (`"Selecione a diretoria..."` vs `"Selecione a delegacia..."`)

### Sem alteração no banco de<lov-plan>

## Adaptar labels do formulário de Novo Chamado para Sede Nacional

### Problema
Quando o usuário seleciona a regional "Sede Nacional" (SEDE-NAC) no formulário de abertura de chamado, os campos continuam exibindo "Delegacia / Sede Regional" e "UOP / Anexo", o que não faz sentido para a sede nacional que usa "Diretoria" e "Anexo / Edifício".

### Solução
Detectar dinamicamente quando a regional selecionada é a SEDE-NAC e trocar os labels dos campos hierárquicos.

### Mapeamento de labels

| Regional selecionada | Campo 2 | Campo 3 |
|---|---|---|
| Qualquer regional | Delegacia / Sede Regional | UOP / Anexo |
| SEDE-NAC | Diretoria | Anexo / Edifício |

### Arquivo a editar
**`src/components/chamados/NovoChamadoDialog.tsx`**

1. Importar `SEDE_NACIONAL_SIGLA` de `NovoAtivoDialog`
2. Determinar se a regional ativa é a sede nacional (comparar `sigla` da regional selecionada com `SEDE_NACIONAL_SIGLA`)
3. Criar variáveis dinâmicas para labels e placeholders:
   - `delegaciaLabel`: "Diretoria" ou "Delegacia / Sede Regional"
   - `uopLabel`: "Anexo / Edifício" ou "UOP / Anexo"
   - Placeholders dos selects ajustados de forma correspondente
4. Substituir os `<Label>` e placeholders estáticos pelos valores dinâmicos

### Sem alteração no banco de dados
A lógica é puramente de apresentação — os dados continuam sendo gravados nas mesmas tabelas (`delegacias`, `uops`).

