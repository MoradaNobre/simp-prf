import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Users, Phone, Pencil, Trash2 } from "lucide-react";
import { useContratos, useContratosSaldo, useDeleteContrato, type Contrato } from "@/hooks/useContratos";
import { useUserRole } from "@/hooks/useUserRole";
import { NovoContratoDialog } from "@/components/contratos/NovoContratoDialog";
import { EditarContratoDialog } from "@/components/contratos/EditarContratoDialog";
import { ContratoContatosDialog } from "@/components/contratos/ContratoContatosDialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const TIPO_LABELS: Record<string, string> = {
  manutencao_predial: "Manutenção Predial",
  manutencao_ar_condicionado: "Ar Condicionado",
};

export default function Contratos() {
  const { data: role } = useUserRole();
  const canManage = role && role !== "operador";
  const { data: contratos = [], isLoading } = useContratos();
  const { data: saldos = [] } = useContratosSaldo();
  const deleteContrato = useDeleteContrato();
  const { toast } = useToast();
  const [novoOpen, setNovoOpen] = useState(false);
  const [editContrato, setEditContrato] = useState<Contrato | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contatosContrato, setContatosContrato] = useState<{ id: string; empresa: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContrato.mutateAsync(deleteId);
      toast({ title: "Contrato excluído com sucesso" });
    } catch {
      toast({ title: "Erro ao excluir contrato", variant: "destructive" });
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Gestão de contratos e custos com terceirizadas</p>
        </div>
        {canManage && (
          <Button onClick={() => setNovoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Contrato
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Contratos Vigentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : contratos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum contrato cadastrado. Adicione contratos com terceirizadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Regional</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor Global</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Preposto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.numero}</TableCell>
                    <TableCell className="text-sm">{(c as any).regionais?.sigla ?? "—"}</TableCell>
                    <TableCell>{c.empresa}</TableCell>
                    <TableCell className="text-sm">
                      {TIPO_LABELS[(c as any).tipo_servico] ?? (c as any).tipo_servico ?? "—"}
                    </TableCell>
                    <TableCell>
                      {c.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const s = saldos.find((x: any) => x.id === c.id);
                        if (!s) return "—";
                        const saldo = Number(s.saldo);
                        const pct = c.valor_total > 0 ? Math.round((Number(s.total_custos) / c.valor_total) * 100) : 0;
                        return (
                          <div className="flex flex-col">
                            <span className={saldo < 0 ? "text-destructive font-medium" : ""}>
                              {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                            <span className="text-xs text-muted-foreground">{pct}% utilizado</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(c.data_inicio), "dd/MM/yyyy")} — {format(new Date(c.data_fim), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(c as any).preposto_nome ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{(c as any).preposto_nome}</span>
                          {(c as any).preposto_telefone && (
                            <a
                              href={`https://wa.me/${(c as any).preposto_telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              <Phone className="h-3 w-3" /> {(c as any).preposto_telefone}
                            </a>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "vigente" ? "default" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar contrato"
                            onClick={() => setEditContrato(c as Contrato)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Responsáveis da empresa"
                          onClick={() => setContatosContrato({ id: c.id, empresa: c.empresa })}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Excluir contrato"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovoContratoDialog open={novoOpen} onOpenChange={setNovoOpen} />

      <EditarContratoDialog
        contrato={editContrato}
        open={!!editContrato}
        onOpenChange={(open) => !open && setEditContrato(null)}
      />

      {contatosContrato && (
        <ContratoContatosDialog
          contratoId={contatosContrato.id}
          empresaNome={contatosContrato.empresa}
          open={!!contatosContrato}
          onOpenChange={(open) => !open && setContatosContrato(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contrato e seus dados associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
