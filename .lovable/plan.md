

## QR Code para Abertura de Chamados por Ambiente

### Conceito

Cada UOP (unidade operacional / ambiente) terá um QR Code único. Quando o usuário escaneia com a câmera do celular, é redirecionado para o SIMP com a localização pré-preenchida, abrindo diretamente o formulário de novo chamado.

### Fluxo do Usuário

```text
QR Code no ambiente
       ↓
Scan com câmera do celular
       ↓
URL: simp-prf.lovable.app/chamado/novo?uop=<uop_id>
       ↓
Login (se não autenticado) → redireciona de volta
       ↓
Formulário de chamado com Regional, Delegacia e UOP pré-selecionados
```

### Implementação

**1. Rota pública de redirecionamento**
- Nova rota `/chamado/novo` em `App.tsx`
- Página `src/pages/NovoChamadoQR.tsx` que:
  - Lê o query param `?uop=<uuid>`
  - Se não autenticado, redireciona para `/login?redirect=/chamado/novo?uop=<uuid>`
  - Se autenticado, redireciona para `/app/chamados?novoUop=<uuid>` (abre o dialog de novo chamado com campos pré-preenchidos)

**2. Pré-preenchimento no formulário de chamado**
- `src/pages/Chamados.tsx`: detectar query param `novoUop` e abrir o `NovoChamadoDialog` automaticamente com o `uopId` pré-selecionado
- `src/components/chamados/NovoChamadoDialog.tsx`: aceitar prop opcional `prefilledUopId` que busca a UOP no banco e preenche automaticamente Regional → Delegacia → UOP

**3. Geração de QR Codes na página de Ativos**
- Adicionar botão "QR Code" em cada UOP na árvore hierárquica (`src/pages/Ativos.tsx`)
- Dialog que exibe o QR Code gerado via biblioteca `qrcode.react` (ou similar)
- Opções: baixar como PNG, imprimir (com nome da UOP e endereço no rodapé)
- Botão "Gerar QR Codes em lote" por delegacia ou regional (gera PDF com todos os QR Codes para impressão)

**4. Geração em lote (PDF)**
- Gerar PDF com múltiplos QR Codes (um por página ou grid) usando `jsPDF` (já presente no projeto)
- Cada QR inclui: nome da UOP, delegacia, regional, endereço

### Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/NovoChamadoQR.tsx` (página de redirecionamento) |
| Criar | `src/components/ativos/QRCodeDialog.tsx` (exibição/download do QR) |
| Editar | `src/App.tsx` (nova rota `/chamado/novo`) |
| Editar | `src/pages/Ativos.tsx` (botão QR em cada UOP) |
| Editar | `src/pages/Chamados.tsx` (detectar query param e abrir dialog) |
| Editar | `src/components/chamados/NovoChamadoDialog.tsx` (prop `prefilledUopId`) |
| Instalar | `qrcode.react` (biblioteca de geração de QR Code) |

### URL do QR Code

```
https://simp-prf.lovable.app/chamado/novo?uop=<uuid_da_uop>
```

### Sem alteração no banco de dados
- O `uop_id` já existe na tabela `chamados`
- A hierarquia Regional → Delegacia → UOP já está modelada
- Não precisa de novas tabelas ou migrações

