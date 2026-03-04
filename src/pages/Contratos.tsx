import { useState } from "react";
import { isAdminRole } from "@/utils/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Users, Phone, Pencil, Trash2, FileDown, Loader2, FilePlus2, Copy, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useContratos, useContratosSaldo, useDeleteContrato, type Contrato } from "@/hooks/useContratos";
import { useUserRole } from "@/hooks/useUserRole";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";
import { NovoContratoDialog, type NovoContratoInitialValues } from "@/components/contratos/NovoContratoDialog";
import { EditarContratoDialog } from "@/components/contratos/EditarContratoDialog";
import { ContratoContatosDialog } from "@/components/contratos/ContratoContatosDialog";
import { ContratoAditivosDialog } from "@/components/contratos/ContratoAditivosDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { generateContratoReport } from "@/utils/generateContratoReport";
import { toast as sonnerToast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  manutencao_predial: "Manutenção Predial",
  manutencao_ar_condicionado: "Ar Condicionado",
};

export default function Contratos() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const isMobile = useIsMobile();
  const canManage = role && !["operador", "preposto", "terceirizado"].includes(role);
  const canDelete = role && (isAdminRole(role) || role === "gestor_regional");
  const isPreposto = role === "preposto";
  const { isNacional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();
  const { data: contratos = [], isLoading } = useContratos(
    effectiveRegionalId,
    isPreposto ? user?.id : null
  );
  const { data: saldos = [] } = useContratosSaldo();
  const deleteContrato = useDeleteContrato();
  const { toast } = useToast();
  const [novoOpen, setNovoOpen] = useState(false);
  const [editContrato, setEditContrato] = useState<Contrato | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contatosContrato, setContatosContrato] = useState<{ id: string; empresa: string } | null>(null);
  const [aditivosContrato, setAditivosContrato] = useState<{ id: string; empresa: string } | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [duplicateValues, setDuplicateValues] = useState<NovoContratoInitialValues | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<"todos" | "vigente" | "encerrado">("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    let success = 0;
    for (const id of ids) {
      try {
        await deleteContrato.mutateAsync(id);
        success++;
      } catch {}
    }
    sonnerToast.success(`${success} contrato(s) excluído(s)`);
    setSelected(new Set());
    setBulkDeleteConfirm(false);
  };

  const handleDuplicate = (c: any) => {
    setDuplicateValues({
      empresa: c.empresa,
      regional_id: c.regional_id || "",
      tipo_servico: c.tipo_servico || "cartao_corporativo",
      objeto: c.objeto || "",
      valor_total: String(c.valor_total || ""),
      preposto_user_id: c.preposto_user_id || "",
    });
    setNovoOpen(true);
  };

  const handleGenerateReport = async (c: any) => {
    setGeneratingPdf(c.id);
    try {
      await generateContratoReport({
        id: c.id,
        numero: c.numero,
        empresa: c.empresa,
        objeto: c.objeto,
        tipo_servico: c.tipo_servico,
        valor_total: c.valor_total,
        data_inicio: c.data_inicio,
        data_fim: c.data_fim,
        status: c.status,
        preposto_nome: c.preposto_nome,
        preposto_email: c.preposto_email,
        preposto_telefone: c.preposto_telefone,
        regional_sigla: c.regionais?.sigla,
        regional_nome: c.regionais?.nome,
      });
      sonnerToast.success("Relatório gerado com sucesso!");
    } catch (err) {
      sonnerToast.error("Erro ao gerar relatório");
      console.error(err);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContrato.mutateAsync(deleteId);
      sonnerToast.success("Contrato excluído com sucesso");
    } catch {
      sonnerToast.error("Erro ao excluir contrato");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground text-sm">Gestão de contratos e custos</p>
        </div>
        {canManage && (
          <Button onClick={() => setNovoOpen(true)} size={isMobile ? "icon" : "default"} className="shrink-0">
            <Plus className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
            {!isMobile && "Novo Contrato"}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isNacional && (
          <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="vigente">Vigente</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Contratos Vigentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Carregando...</p>
          ) : contratos.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4">Nenhum contrato cadastrado.</p>
          ) : (() => {
            const hoje = new Date();
            const filtered = contratos.filter((c) => {
              if (statusFilter === "todos") return true;
              const isVigente = hoje >= new Date(c.data_inicio + "T00:00:00") && hoje <= new Date(c.data_fim + "T23:59:59");
              return statusFilter === "vigente" ? isVigente : !isVigente;
            });
            if (filtered.length === 0) return <p className="text-muted-foreground text-sm p-4">Nenhum contrato encontrado para o filtro selecionado.</p>;
            return isMobile ? (
            <div className="space-y-3 p-3">
              {filtered.map((c) => {
                const s = saldos.find((x: any) => x.id === c.id);
                const saldo = s ? Number(s.saldo) : null;
                const pct = s && c.valor_total > 0 ? Math.round((Number(s.total_custos) / c.valor_total) * 100) : 0;
                const computedStatus = hoje >= new Date(c.data_inicio + "T00:00:00") && hoje <= new Date(c.data_fim + "T23:59:59") ? "vigente" : "encerrado";
                return (
                  <Card key={c.id} className="border">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-muted-foreground">{c.numero}</p>
                          <p className="font-medium text-sm">{c.empresa}</p>
                        </div>
                        <Badge variant={computedStatus === "vigente" ? "default" : "secondary"} className="shrink-0 text-[10px]">
                          {computedStatus}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Regional: {(c as any).regionais?.sigla ?? "—"}</span>
                        <span className="text-right">{TIPO_LABELS[(c as any).tipo_servico] ?? "—"}</span>
                        <span>Valor: {c.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        <span className={`text-right ${saldo !== null && saldo < 0 ? "text-destructive font-medium" : ""}`}>
                          Saldo: {saldo !== null ? saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                        </span>
                        <span>{format(new Date(c.data_inicio + "T00:00:00"), "dd/MM/yy")} — {format(new Date(c.data_fim + "T00:00:00"), "dd/MM/yy")}</span>
                        <span className="text-right">{pct}% utilizado</span>
                      </div>
                      {(c as any).preposto_nome && (
                        <div className="text-xs text-muted-foreground">
                          {c.tipo_servico === "cartao_corporativo" ? "Suprido" : "Preposto"}: {(c as any).preposto_nome}
                          {(c as any).preposto_telefone && (
                            <a
                              href={`https://wa.me/${(c as any).preposto_telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              <Phone className="h-3 w-3" /> {(c as any).preposto_telefone}
                            </a>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Relatório PDF" disabled={generatingPdf === c.id} onClick={() => handleGenerateReport(c)}>
                          {generatingPdf === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                        </Button>
                        {c.tipo_servico === "cartao_corporativo" && canManage && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicar contrato" onClick={() => handleDuplicate(c)}><Copy className="h-3.5 w-3.5" /></Button>
                        )}
                        {canManage && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditContrato(c as Contrato)}><Pencil className="h-3.5 w-3.5" /></Button>
                        )}
                        {(canManage || isPreposto) && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setContatosContrato({ id: c.id, empresa: c.empresa })}><Users className="h-3.5 w-3.5" /></Button>
                        )}
                        {canManage && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Aditivos" onClick={() => setAditivosContrato({ id: c.id, empresa: c.empresa })}><FilePlus2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
                  <TableHead>Preposto / Suprido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
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
                      {format(new Date(c.data_inicio + "T00:00:00"), "dd/MM/yyyy")} — {format(new Date(c.data_fim + "T00:00:00"), "dd/MM/yyyy")}
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
                      {(() => {
                        const inicio = new Date(c.data_inicio + "T00:00:00");
                        const fim = new Date(c.data_fim + "T23:59:59");
                        const computedStatus = hoje >= inicio && hoje <= fim ? "vigente" : "encerrado";
                        return (
                          <Badge variant={computedStatus === "vigente" ? "default" : "secondary"}>{computedStatus}</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="Relatório PDF" disabled={generatingPdf === c.id} onClick={() => handleGenerateReport(c)}>
                          {generatingPdf === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        </Button>
                        {(c as any).tipo_servico === "cartao_corporativo" && canManage && (
                          <Button size="icon" variant="ghost" title="Duplicar contrato" onClick={() => handleDuplicate(c)}><Copy className="h-4 w-4" /></Button>
                        )}
                        {canManage && (
                          <Button size="icon" variant="ghost" title="Editar contrato" onClick={() => setEditContrato(c as Contrato)}><Pencil className="h-4 w-4" /></Button>
                        )}
                        {(canManage || isPreposto) && (
                          <Button size="icon" variant="ghost" title="Responsáveis da empresa" onClick={() => setContatosContrato({ id: c.id, empresa: c.empresa })}><Users className="h-4 w-4" /></Button>
                        )}
                        {canManage && (
                          <Button size="icon" variant="ghost" title="Aditivos contratuais" onClick={() => setAditivosContrato({ id: c.id, empresa: c.empresa })}><FilePlus2 className="h-4 w-4" /></Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="ghost" title="Excluir contrato" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            );
          })()}
        </CardContent>
      </Card>

      <NovoContratoDialog open={novoOpen} onOpenChange={(open) => { setNovoOpen(open); if (!open) setDuplicateValues(undefined); }} initialValues={duplicateValues} />

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

      {aditivosContrato && (
        <ContratoAditivosDialog
          contratoId={aditivosContrato.id}
          empresaNome={aditivosContrato.empresa}
          open={!!aditivosContrato}
          onOpenChange={(open) => !open && setAditivosContrato(null)}
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
