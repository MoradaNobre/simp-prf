

## Consolidar Sede Nacional — Eliminar Duplicidade

### Problema Identificado
Existem **dois registros** de regional para a Sede Nacional:
1. **"SEDE NACIONAL"** (UASG 200109) — cadastrada originalmente como regional comum na Gestão do Sistema
2. **"SEDE-NAC"** (sem UASG) — criada automaticamente pela feature de ativos nacionais

Isso gera inconsistência: chamados, delegacias e UOPs podem estar vinculados a registros diferentes, e os labels dinâmicos no formulário de chamado dependem da sigla `SEDE-NAC`.

### Solução

Unificar em **um único registro**, mantendo o que já existe (UASG 200109) e adaptando o código para reconhecê-lo.

### Passos

**1. Definir a sigla oficial**
- Alterar a constante `SEDE_NACIONAL_SIGLA` de `"SEDE-NAC"` para `"SEDE NACIONAL"` (a sigla que já está no banco com UASG 200109)
- Atualizar em `NovoAtivoDialog.tsx` (definição) e todos os arquivos que importam essa constante

**2. Migração de dados**
- SQL para migrar delegacias/UOPs vinculadas ao registro duplicado `SEDE-NAC` para o registro original `SEDE NACIONAL`
- Excluir o registro duplicado `SEDE-NAC` após migração

**3. Remover auto-criação da regional**
- No `NovoAtivoDialog.tsx`, remover a lógica que cria automaticamente uma regional `SEDE-NAC` quando não encontrada
- A aba Nacional deve simplesmente buscar a regional com a sigla `SEDE NACIONAL` já existente

**4. Proteger a Sede Nacional na Gestão**
- Na listagem de regionais (`GestaoRegionais.tsx`), marcar visualmente a Sede Nacional (badge ou ícone) para evitar exclusão acidental
- Opcionalmente ocultar botão de excluir para essa regional específica

**5. Verificar consistência nos labels dinâmicos**
- `NovoChamadoDialog.tsx`: ajustar comparação para usar a nova constante
- `Ativos.tsx`: filtro `SEDE_NACIONAL_SIGLA` já funciona via constante importada

### Arquivos a editar

| Arquivo | Alteração |
|---|---|
| `src/components/ativos/NovoAtivoDialog.tsx` | Alterar constante, remover auto-criação |
| `src/pages/Ativos.tsx` | Nenhuma (usa constante importada) |
| `src/components/chamados/NovoChamadoDialog.tsx` | Nenhuma (usa constante importada) |
| `src/components/gestao/GestaoRegionais.tsx` | Proteger exclusão da Sede Nacional |
| **Migração SQL** | Mover dados e excluir duplicata |

### Resultado
- Um único registro "SEDE NACIONAL" com UASG 200109
- Labels dinâmicos funcionando em chamados e ativos
- Sem risco de duplicação futura

