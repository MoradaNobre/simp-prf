import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContratoContatos, useCreateContratoContato, useDeleteContratoContato } from "@/hooks/useContratos";
import { useUsersByRole } from "@/hooks/useUsersByRole";
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
  const { data: terceirizados = [] } = useUsersByRole(["terceirizado", "preposto"]);

  const [showForm, setShowForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [funcao, setFuncao] = useState("");

  // Filter out users already added as contacts
  const existingUserIds = new Set(contatos.map((c) => c.user_id).filter(Boolean));
  const availableUsers = terceirizados.filter((u) => !existingUserIds.has(u.user_id));

  const selectedUser = terceirizados.find((u) => u.user_id === selectedUserId);

  const handleAdd = async () => {
    if (!selectedUserId || !selectedUser) {
      toast({ title: "Selecione um usuário", variant: "destructive" });
      return;
    }
    try {
      await createContato.mutateAsync({
        contrato_id: contratoId,
        nome: selectedUser.full_name,
        telefone: selectedUser.phone || null,
        funcao: funcao.trim() || null,
        user_id: selectedUserId,
      });
      setSelectedUserId("");
      setFuncao("");
      setShowForm(false);
      toast({ title: "Responsável adicionado" });
    } catch {
      toast({ title: "Erro ao adicionar responsável", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContato.mutateAsync({ id, contratoId });
      toast({ title: "Responsável removido" });
    } catch {
      toast({ title: "Erro ao remover responsável", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Responsáveis — {empresaNome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Selecione usuários cadastrados no sistema com perfil de Preposto ou Terceirizado.
        </p>

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
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contatos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.funcao || "—"}</TableCell>
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
                <Label>Usuário *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um usuário..." /></SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name}{u.phone ? ` — ${u.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum usuário disponível. Cadastre usuários com perfil "Terceirizado" ou "Preposto" em Gestão do Sistema.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Ex: Técnico, Encarregado" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setSelectedUserId(""); setFuncao(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd} disabled={createContato.isPending || !selectedUserId}>Adicionar</Button>
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
