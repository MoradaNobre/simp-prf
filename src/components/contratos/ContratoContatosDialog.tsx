import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContratoContatos, useCreateContratoContato, useDeleteContratoContato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  contratoId: string;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContratoContatosDialog({ contratoId, empresaNome, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: contatos = [], isLoading } = useContratoContatos(contratoId);
  const createContato = useCreateContratoContato();
  const deleteContato = useDeleteContratoContato();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", funcao: "" });
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleAdd = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Informe o nome do contato", variant: "destructive" });
      return;
    }
    try {
      await createContato.mutateAsync({
        contrato_id: contratoId,
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        funcao: form.funcao.trim() || null,
      });
      setForm({ nome: "", email: "", telefone: "", funcao: "" });
      setShowForm(false);
      toast({ title: "Contato adicionado" });
    } catch {
      toast({ title: "Erro ao adicionar contato", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContato.mutateAsync({ id, contratoId });
      toast({ title: "Contato removido" });
    } catch {
      toast({ title: "Erro ao remover contato", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Responsáveis — {empresaNome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Pessoas da empresa que atendem os chamados/despachos.</p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : contatos.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
        ) : (
          contatos.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contatos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.funcao || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.telefone || "—"}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {showForm && (
          <div className="border rounded-md p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Input value={form.funcao} onChange={(e) => set("funcao", e.target.value)} placeholder="Ex: Técnico" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd} disabled={createContato.isPending}>Adicionar</Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Responsável
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
