import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContratoAditivos, useCreateContratoAditivo, useDeleteContratoAditivo } from "@/hooks/useContratoAditivos";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { isAdminRole } from "@/utils/roles";
import { toast } from "sonner";
import { Loader2, Plus, FilePlus2, Trash2 } from "lucide-react";

interface Props {
  contratoId: string;
  empresaNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContratoAditivosDialog({ contratoId, empresaNome, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { data: aditivos = [], isLoading } = useContratoAditivos(contratoId);
  const createAditivo = useCreateContratoAditivo();
  const deleteAditivo = useDeleteContratoAditivo();
  const { data: role } = useUserRole();
  const canDelete = isAdminRole(role) || role === "gestor_regional";
  const [showForm, setShowForm] = useState(false);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [numeroAditivo, setNumeroAditivo] = useState("");
  const [dataAditivo, setDataAditivo] = useState(new Date().toISOString().split("T")[0]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalAditivos = aditivos.reduce((s, a) => s + Number(a.valor), 0);

  const handleSubmit = async () => {
    const val = parseFloat(valor);
    if (!val || val <= 0) { toast.error("Informe um valor válido"); return; }
    if (!descricao.trim()) { toast.error("Informe a descrição do aditivo"); return; }
    try {
      await createAditivo.mutateAsync({
        contrato_id: contratoId,
        valor: val,
        descricao: descricao.trim(),
        numero_aditivo: numeroAditivo.trim() || undefined,
        data_aditivo: dataAditivo,
        created_by: user?.id || "",
      });
      toast.success("Aditivo registrado com sucesso!");
      setShowForm(false);
      setValor("");
      setDescricao("");
      setNumeroAditivo("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5" /> Aditivos Contratuais
          </DialogTitle>
          <DialogDescription>{empresaNome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : aditivos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum aditivo registrado.</p>
          ) : (
            <div className="space-y-2">
              {aditivos.map((a) => (
                <div key={a.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      {a.numero_aditivo && <span className="text-xs font-mono text-muted-foreground">{a.numero_aditivo} · </span>}
                      <span className="text-sm font-medium">{fmt(a.valor)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.data_aditivo + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir aditivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O aditivo de {fmt(a.valor)} será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    await deleteAditivo.mutateAsync({ id: a.id, contrato_id: contratoId });
                                    toast.success("Aditivo excluído!");
                                  } catch (err: any) {
                                    toast.error("Erro: " + err.message);
                                  }
                                }}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.descricao}</p>
                </div>
              ))}
              <div className="text-sm font-medium text-right pt-1">
                Total de aditivos: {fmt(totalAditivos)}
              </div>
            </div>
          )}

          {!showForm ? (
            <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Registrar Aditivo
            </Button>
          ) : (
            <div className="space-y-3 border rounded-md p-3">
              <h4 className="text-sm font-medium">Novo Aditivo</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$) *</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nº do Aditivo</Label>
                  <Input placeholder="Ex: 1º TA" value={numeroAditivo} onChange={(e) => setNumeroAditivo(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data do Aditivo</Label>
                <Input type="date" value={dataAditivo} onChange={(e) => setDataAditivo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição / Justificativa *</Label>
                <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o objeto do aditivo..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setValor(""); setDescricao(""); }} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createAditivo.isPending} className="flex-1">
                  {createAditivo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
