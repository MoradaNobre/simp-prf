import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContratoContatos, useDeleteContratoContato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  contratoId: string;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContratoContatosDialog({ contratoId, empresaNome, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: contatos = [], isLoading } = useContratoContatos(contratoId);
  const deleteContato = useDeleteContratoContato();

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [funcao, setFuncao] = useState("");
  const [role, setRole] = useState<string>("terceirizado");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setNome("");
    setEmail("");
    setTelefone("");
    setFuncao("");
    setRole("terceirizado");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "E-mail válido é obrigatório", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-contract-user", {
        body: {
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim() || null,
          funcao: funcao.trim() || null,
          contrato_id: contratoId,
          role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["contrato-contatos", contratoId] });
      resetForm();
      toast({
        title: data?.user_created
          ? "Usuário criado e vinculado ao contrato"
          : "Usuário vinculado ao contrato",
      });
    } catch (err: any) {
      toast({ title: err.message || "Erro ao adicionar responsável", variant: "destructive" });
    } finally {
      setSubmitting(false);
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
          Pessoas da empresa que atendem os chamados/despachos. Ao adicionar, uma conta será criada automaticamente no sistema.
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
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Ex: Técnico, Encarregado" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Perfil no sistema</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terceirizado">Terceirizado</SelectItem>
                    <SelectItem value="preposto">Preposto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm} disabled={submitting}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd} disabled={submitting || !nome.trim() || !email.trim()}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Adicionar
              </Button>
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
