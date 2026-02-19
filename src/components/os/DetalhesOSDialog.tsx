import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateOS, useOSCustos, useAddCusto, type OrdemServico } from "@/hooks/useOrdensServico";
import { useContratos, useContratosSaldo } from "@/hooks/useContratos";
import { useSaldoOrcamentarioRegional, useCreateSolicitacaoCredito } from "@/hooks/useSaldoOrcamentario";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, DollarSign, User, FileText, Upload, CheckCircle, Download, Undo2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { generateOSReport } from "@/utils/generateOSReport";
import { generateOSExecucaoReport } from "@/utils/generateOSExecucaoReport";
import { useQuery } from "@tanstack/react-query";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguardando Autorização",
  execucao: "Execução", ateste: "Ateste", pagamento: "Pagamento", encerrada: "Encerrada",
};
const statusFlow = ["aberta", "orcamento", "autorizacao", "execucao", "ateste", "pagamento", "encerrada"];
const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  orcamento: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  autorizacao: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  execucao: "bg-accent text-accent-foreground",
  ateste: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pagamento: "bg-success text-success-foreground",
  encerrada: "bg-muted text-muted-foreground",
};

interface Props {
  os: OrdemServico | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalhesOSDialog({ os, open, onOpenChange }: Props) {
  const updateOS = useUpdateOS();
  const custos = useOSCustos(os?.id);
  const addCusto = useAddCusto();
  const { data: role } = useUserRole();
  
  const isGestorOrFiscal = role === "gestor_nacional" || role === "gestor_regional" || role === "fiscal_contrato";
  const isPreposto = role === "preposto";
  const isTerceirizado = role === "terceirizado";
  const isOperador = role === "operador";

  const [uploading, setUploading] = useState(false);
  const [custoDesc, setCustoDesc] = useState("");
  const [custoTipo, setCustoTipo] = useState("peca");
  const [custoValor, setCustoValor] = useState("");
  const [selectedContratoId, setSelectedContratoId] = useState("");
  const [valorOrcamento, setValorOrcamento] = useState("");
  const [arquivoOrcamento, setArquivoOrcamento] = useState<File | null>(null);
  const [documentosPagamento, setDocumentosPagamento] = useState<FileList | null>(null);
  const [motivoRestituicao, setMotivoRestituicao] = useState("");
  const [showRestituir, setShowRestituir] = useState(false);
  const [selectedPrioridade, setSelectedPrioridade] = useState("");
  const [motivoSolicitacao, setMotivoSolicitacao] = useState("");
  const [showSolicitacao, setShowSolicitacao] = useState(false);

  const { data: contratosAll = [] } = useContratos();
  const { data: saldos = [] } = useContratosSaldo();

  // Budget data for authorization blocking
  const osRegionalId = (os as any)?.regional_id;
  const { data: saldoOrcamento } = useSaldoOrcamentarioRegional(osRegionalId);
  const createSolicitacao = useCreateSolicitacaoCredito();
  const contratoId = os?.contrato_id;
  const { data: contatos = [] } = useQuery({
    queryKey: ["contrato-contatos", contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from("contrato_contatos")
        .select("id, nome, funcao")
        .eq("contrato_id", contratoId);
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId,
  });

  useEffect(() => {
    setSelectedContratoId(os?.contrato_id ?? "");
    setSelectedPrioridade(os?.prioridade ?? "");
    setValorOrcamento("");
    setArquivoOrcamento(null);
    setDocumentosPagamento(null);
  }, [os?.id, os?.contrato_id, os?.prioridade]);

  if (!os) return null;

  const currentIdx = statusFlow.indexOf(os.status);
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

  // Permission logic per step
  const canAdvance = (() => {
    if (!nextStatus) return false;
    switch (nextStatus) {
      case "orcamento": return isGestorOrFiscal; // vincular contrato e encaminhar
      case "autorizacao": return isPreposto || isTerceirizado; // upload budget
      case "execucao": return isGestorOrFiscal; // authorize execution
      case "ateste": return isPreposto || isTerceirizado; // submit execution evidence
      case "pagamento": return isGestorOrFiscal || isOperador || ((isPreposto || isTerceirizado) && !!(os as any).motivo_restituicao); // approve (ateste) or resubmit after restitution
      default: return false;
    }
  })();

  // Can submit payment docs (final step action, not advancing)
  const canSubmitPayment = os.status === "pagamento" && (isPreposto || isTerceirizado);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("os-fotos").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("os-fotos").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendTransitionNotification = async (fromStatus: string, toStatus: string, motivoRestituicao?: string): Promise<boolean> => {
    try {
      const { data: notifyData, error: notifyError } = await supabase.functions.invoke("notify-os-transition", {
        body: { os_id: os.id, from_status: fromStatus, to_status: toStatus, motivo_restituicao: motivoRestituicao },
      });
      if (notifyError) return false;
      if (notifyData && notifyData.success === false) return false;
      if (notifyData && notifyData.warning && notifyData.recipients?.length === 0) return false;
      return true;
    } catch {
      return false;
    }
  };

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;

    // Validation for orcamento: must link contract
    if (nextStatus === "orcamento" && !selectedContratoId) {
      toast.error("Vincule um contrato antes de encaminhar para Orçamento");
      return;
    }

    // Validation for autorizacao: must upload budget
    if (nextStatus === "autorizacao") {
      if (!arquivoOrcamento) {
        toast.error("Carregue o arquivo do orçamento (Excel ou PDF)");
        return;
      }
      if (!valorOrcamento || parseFloat(valorOrcamento) <= 0) {
        toast.error("Informe o valor total do orçamento");
        return;
      }
    }

    setUploading(true);
    try {
      const updates: any = { id: os.id, status: nextStatus, motivo_restituicao: null };

      if (nextStatus === "orcamento") {
        if (selectedContratoId) updates.contrato_id = selectedContratoId;
        if (selectedPrioridade && selectedPrioridade !== os.prioridade) {
          updates.prioridade = selectedPrioridade;
        }
      }

      if (nextStatus === "autorizacao" && arquivoOrcamento) {
        const url = await uploadFile(arquivoOrcamento, "orcamentos");
        updates.arquivo_orcamento = url;
        updates.valor_orcamento = parseFloat(valorOrcamento);
      }

      await updateOS.mutateAsync(updates);
      toast.success(`Status alterado para ${statusLabels[nextStatus]}`);

      // Send notification for this transition
      const emailOk = await sendTransitionNotification(os.status, nextStatus);
      if (!emailOk) {
        toast.warning("A notificação por e-mail pode não ter sido enviada. Verifique manualmente.", { duration: 8000 });
      }

      // Generate execution report and send email when advancing to execucao
      if (nextStatus === "execucao") {
        try {
          // Gather data for the report
          const uop = os.uops as any;
          const delegacia = uop?.delegacias;
          const regional = (os as any).regionais || delegacia?.regionais;
          
          let contratoInfo: any = null;
          if (os.contrato_id) {
            const { data } = await supabase
              .from("contratos")
              .select("numero, empresa, preposto_nome")
              .eq("id", os.contrato_id)
              .single();
            contratoInfo = data;
          }

          // Get solicitante name
          const { data: solicitanteProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", os.solicitante_id)
            .single();

          // Get execution responsible name
          let responsavelExecNome = "";
          if (os.responsavel_execucao_id) {
            const { data: contatoData } = await supabase
              .from("contrato_contatos")
              .select("nome")
              .eq("id", os.responsavel_execucao_id)
              .maybeSingle();
            if (contatoData) responsavelExecNome = contatoData.nome;
          }

          // Get current user (fiscal) name
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const { data: fiscalProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", currentUser?.id || "")
            .single();

          const reportData = {
            codigo: os.codigo,
            titulo: os.titulo,
            tipo: os.tipo,
            descricao: os.descricao || "",
            localNome: uop?.nome || "—",
            regionalNome: regional?.nome || "",
            regionalSigla: regional?.sigla || "",
            solicitanteNome: solicitanteProfile?.full_name || "—",
            valorOrcamento: Number((os as any).valor_orcamento) || 0,
            contratoNumero: contratoInfo?.numero,
            contratoEmpresa: contratoInfo?.empresa,
            responsavelExecucaoNome: responsavelExecNome || undefined,
            dataAbertura: new Date(os.data_abertura).toLocaleDateString("pt-BR"),
            dataAutorizacao: new Date().toLocaleDateString("pt-BR"),
            fiscalNome: fiscalProfile?.full_name || undefined,
          };

          // Save to relatorios_execucao
          const { data: relatorio, error: relErr } = await supabase
            .from("relatorios_execucao")
            .insert({
              os_id: os.id,
              codigo_os: os.codigo,
              titulo_os: os.titulo,
              regional_id: (os as any).regional_id || delegacia?.regional_id || null,
              contrato_id: os.contrato_id || null,
              contrato_numero: contratoInfo?.numero || null,
              contrato_empresa: contratoInfo?.empresa || null,
              valor_orcamento: reportData.valorOrcamento,
              dados_json: reportData,
              gerado_por_id: currentUser?.id || "",
            })
            .select("id")
            .single();

          if (relErr) {
            console.error("Error saving execution report:", relErr);
          }

          // Generate PDF as base64 and send via email with attachment
          try {
            const pdfDoc = generateOSExecucaoReport(reportData);
            const pdfBase64 = pdfDoc.output("datauristring").split(",")[1];

            await supabase.functions.invoke("send-os-execucao", {
              body: {
                os_id: os.id,
                relatorio_execucao_id: relatorio?.id || null,
                report_data: reportData,
                pdf_base64: pdfBase64,
              },
            });
          } catch (emailErr) {
            console.warn("Erro ao enviar email com PDF:", emailErr);
          }

          toast.success("Relatório de execução gerado e enviado por e-mail!");
        } catch (err) {
          console.error("Error generating execution report:", err);
          toast.warning("OS autorizada, mas houve erro ao gerar o relatório de execução");
        }
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFotoDepois = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, "depois");
      await updateOS.mutateAsync({ id: os.id, foto_depois: url });
      toast.success("Foto enviada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPaymentDocs = async () => {
    if (!documentosPagamento || documentosPagamento.length === 0) {
      toast.error("Selecione os documentos para pagamento");
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(documentosPagamento)) {
        const url = await uploadFile(file, "pagamento");
        urls.push(url);
      }
      const existing = (os as any).documentos_pagamento || [];
      await updateOS.mutateAsync({
        id: os.id,
        documentos_pagamento: [...existing, ...urls],
      } as any);
      toast.success("Documentos de pagamento enviados!");
      // Notify gestor/fiscal that payment docs are ready for closure
      const emailOk2 = await sendTransitionNotification("pagamento", "encerrada");
      if (!emailOk2) toast.warning("A notificação por e-mail pode não ter sido enviada.", { duration: 8000 });
      setDocumentosPagamento(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCusto = async () => {
    if (!custoDesc.trim() || !custoValor) return;
    try {
      await addCusto.mutateAsync({
        os_id: os.id,
        descricao: custoDesc,
        tipo: custoTipo,
        valor: parseFloat(custoValor),
      });
      setCustoDesc(""); setCustoValor("");
      toast.success("Custo registrado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const totalCustos = (custos.data || []).reduce((sum, c) => sum + Number(c.valor), 0);
  const paymentDocs: string[] = (os as any).documentos_pagamento || [];

  // Status stepper
  const renderStepper = () => (
    <div className="flex items-center gap-1 flex-wrap pb-1">
      {statusFlow.map((s, i) => {
        const isCurrent = s === os.status;
        const isPast = i < currentIdx;
        return (
          <div key={s} className="flex items-center gap-1">
            <div className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium ${
              isCurrent ? statusColors[s] : isPast ? "bg-muted text-muted-foreground line-through" : "bg-muted/50 text-muted-foreground/50"
            }`}>
              {i + 1}. {statusLabels[s]}
            </div>
            {i < statusFlow.length - 1 && <span className="text-muted-foreground/30">→</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{os.codigo}</span>
            {os.titulo}
          </DialogTitle>
          <DialogDescription>Detalhes e gestão da Ordem de Serviço</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stepper */}
          {renderStepper()}

          {/* Status & Priority */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={prioridadeColors[os.prioridade] as any}>
              {prioridadeLabels[os.prioridade]}
            </Badge>
            <Badge variant="outline">{os.tipo === "corretiva" ? "Corretiva" : "Preventiva"}</Badge>
            {os.status === "pagamento" && paymentDocs.length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300">
                Aguardando Pagamento
              </Badge>
            )}
            {os.uops && <span className="text-sm text-muted-foreground">{(os.uops as any).nome}</span>}
          </div>

          {/* Restitution alert */}
          {(os as any).motivo_restituicao && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1">
                <Undo2 className="h-4 w-4" /> OS Restituída
              </p>
              <p className="text-sm text-foreground">{(os as any).motivo_restituicao}</p>
            </div>
          )}

          {os.descricao && (
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <p className="text-sm mt-1">{os.descricao}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Abertura:</span>{" "}
              {new Date(os.data_abertura).toLocaleDateString("pt-BR")}
            </div>
            {(os as any).valor_orcamento > 0 && (
              <div>
                <span className="text-muted-foreground">Orçamento:</span>{" "}
                R$ {Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Contract balance info */}
          {os.contrato_id && (() => {
            const contrato = contratosAll.find(c => c.id === os.contrato_id);
            const saldoInfo = saldos.find((s: any) => s.id === os.contrato_id);
            if (!contrato) return null;
            const saldo = saldoInfo ? Number((saldoInfo as any).saldo) : null;
            const pct = saldoInfo && contrato.valor_total > 0 ? Math.round((Number((saldoInfo as any).total_custos) / contrato.valor_total) * 100) : 0;
            return (
              <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" /> Contrato: {contrato.numero} — {contrato.empresa}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Valor Global: {contrato.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  {saldo !== null && (
                    <span className={saldo < 0 ? "text-destructive font-medium" : "text-foreground"}>
                      Saldo: {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      <span className="text-muted-foreground ml-1">({pct}% utilizado)</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Budget file link */}
          {(os as any).arquivo_orcamento && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <a href={(os as any).arquivo_orcamento} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Ver arquivo do orçamento
              </a>
            </div>
          )}

          {/* Photos */}
          <div className="grid grid-cols-2 gap-3">
            {os.foto_antes && (
              <div>
                <Label className="text-xs text-muted-foreground">Foto Antes</Label>
                <img src={os.foto_antes} alt="Antes" className="mt-1 rounded-md border max-h-40 object-cover w-full" />
              </div>
            )}
            {os.foto_depois ? (
              <div>
                <Label className="text-xs text-muted-foreground">Foto Depois</Label>
                <img src={os.foto_depois} alt="Depois" className="mt-1 rounded-md border max-h-40 object-cover w-full" />
              </div>
            ) : os.status === "execucao" && (isPreposto || isTerceirizado) && (
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Foto Depois
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-1"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFotoDepois(f); }}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
              </div>
            )}
          </div>

          {/* Payment documents */}
          {paymentDocs.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Documentos de Pagamento</Label>
              <div className="space-y-1">
                {paymentDocs.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary underline">
                    <FileText className="h-3 w-3" /> Documento {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* === STEP-SPECIFIC ACTIONS === */}

          {/* ABERTA → ORCAMENTO: vincular contrato e encaminhar */}
          {canAdvance && nextStatus === "orcamento" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Vincular Contrato e Encaminhar para Orçamento</h4>
                <Select value={selectedContratoId || "none"} onValueChange={(v) => setSelectedContratoId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contratosAll
                      .filter((c) => {
                        const hoje = new Date();
                        const vigente = hoje >= new Date(c.data_inicio + "T00:00:00") && hoje <= new Date(c.data_fim + "T23:59:59");
                        if (!vigente) return false;
                        // Filter by OS regional
                        const osRegionalId = (os as any).regional_id;
                        if (osRegionalId && c.regional_id) return c.regional_id === osRegionalId;
                        return true;
                      })
                      .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero} — {c.empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedContratoId && (() => {
                  const s = saldos.find((x: any) => x.id === selectedContratoId);
                  const c = contratosAll.find(x => x.id === selectedContratoId);
                  if (!s || !c) return null;
                  const saldo = Number((s as any).saldo);
                  const pct = c.valor_total > 0 ? Math.round((Number((s as any).total_custos) / c.valor_total) * 100) : 0;
                  return (
                    <div className="text-sm p-2 rounded-md bg-muted flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Valor: {c.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      <span className={saldo < 0 ? "text-destructive font-medium" : ""}>
                        Saldo: {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="text-muted-foreground">({pct}% utilizado)</span>
                    </div>
                  );
                })()}
                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <Select value={selectedPrioridade} onValueChange={setSelectedPrioridade}>
                    <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">Vincule o contrato, ajuste a prioridade se necessário, e encaminhe para que o preposto/terceirizado elabore o orçamento.</p>
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Encaminhar para Orçamento
                </Button>
              </div>
            </>
          )}

          {/* ORCAMENTO → AUTORIZACAO: preposto/terceirizado uploads budget */}
          {canAdvance && nextStatus === "autorizacao" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Orçamento — Enviar proposta
                </h4>
                <div className="space-y-1.5">
                  <Label>Arquivo do orçamento (Excel ou PDF) *</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.pdf"
                    onChange={(e) => setArquivoOrcamento(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor total do serviço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={valorOrcamento}
                    onChange={(e) => setValorOrcamento(e.target.value)}
                  />
                </div>
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Orçamento
                </Button>
              </div>
            </>
          )}

          {/* AUTORIZACAO → EXECUCAO: gestor/fiscal authorizes — with budget blocking */}
          {canAdvance && nextStatus === "execucao" && (() => {
            const valorOS = Number((os as any).valor_orcamento) || 0;
            const saldoContrato = (() => {
              const s = saldos.find((x: any) => x.id === os.contrato_id);
              return s ? Number((s as any).saldo) : null;
            })();
            const saldoOrc = saldoOrcamento?.saldo_disponivel ?? null;
            const contratoInsuficiente = saldoContrato !== null && saldoContrato < valorOS;
            const orcamentoInsuficiente = saldoOrc !== null && saldoOrc < valorOS;
            const semOrcamentoCadastrado = saldoOrc === null;
            const bloqueado = contratoInsuficiente || orcamentoInsuficiente || semOrcamentoCadastrado;
            const isGestorNacional = role === "gestor_nacional";

            return (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Autorização para Execução
                  </h4>
                  {(os as any).arquivo_orcamento && (
                    <div className="text-sm p-3 bg-muted rounded-md space-y-1">
                      <p><span className="text-muted-foreground">Orçamento da OS:</span> R$ {valorOS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <a href={(os as any).arquivo_orcamento} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                        Ver arquivo do orçamento
                      </a>
                    </div>
                  )}

                  {/* Saldo do contrato */}
                  {os.contrato_id && (() => {
                    const c = contratosAll.find(x => x.id === os.contrato_id);
                    if (!c || saldoContrato === null) return null;
                    return (
                      <div className={`text-sm p-3 rounded-md border ${contratoInsuficiente ? "border-destructive bg-destructive/10" : "bg-muted/50"}`}>
                        <div className="flex items-center gap-2">
                          {contratoInsuficiente ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium">Saldo do Contrato</span>
                        </div>
                        <p className="mt-1">
                          <span className={saldoContrato < 0 ? "text-destructive font-medium" : ""}>
                            {saldoContrato.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          <span className="text-muted-foreground ml-2">de {c.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </p>
                        {contratoInsuficiente && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            ⚠ Saldo do contrato insuficiente para esta OS
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Saldo do orçamento regional */}
                  <div className={`text-sm p-3 rounded-md border ${orcamentoInsuficiente ? "border-destructive bg-destructive/10" : semOrcamentoCadastrado ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800" : "bg-muted/50"}`}>
                    <div className="flex items-center gap-2">
                      {orcamentoInsuficiente || semOrcamentoCadastrado ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium">Saldo Orçamentário da Regional</span>
                    </div>
                    {semOrcamentoCadastrado ? (
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 font-medium">
                        ⚠ Nenhum orçamento cadastrado para esta regional no exercício atual
                      </p>
                    ) : (
                      <>
                        <div className="mt-1 grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-muted-foreground text-xs">Disponível</span>
                            <p className={saldoOrc! < valorOS ? "text-destructive font-medium" : ""}>
                              {saldoOrc!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Empenhado</span>
                            <p>{(saldoOrcamento?.total_empenhos ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Não empenhado</span>
                            <p>{(saldoOrcamento?.credito_nao_empenhado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                          </div>
                        </div>
                        {orcamentoInsuficiente && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            ⚠ Saldo orçamentário insuficiente para esta OS
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {bloqueado && !isGestorNacional ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Autorização Bloqueada
                        </p>
                        <p className="text-xs text-foreground mt-1">
                          Não é possível autorizar esta OS pois o saldo é insuficiente.
                          Solicite crédito suplementar ao Gestor Nacional para prosseguir.
                        </p>
                      </div>
                      {!showSolicitacao ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowSolicitacao(true)}
                          className="w-full"
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Solicitar Crédito Suplementar
                        </Button>
                      ) : (
                        <div className="space-y-2 border rounded-md p-3">
                          <Label className="text-sm font-medium">Justificativa da solicitação *</Label>
                          <Textarea
                            value={motivoSolicitacao}
                            onChange={(e) => setMotivoSolicitacao(e.target.value)}
                            placeholder="Descreva a necessidade e urgência do serviço..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setShowSolicitacao(false); setMotivoSolicitacao(""); }} className="flex-1">
                              Cancelar
                            </Button>
                            <Button
                              disabled={!motivoSolicitacao.trim() || createSolicitacao.isPending}
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  const { data: { user: currentUser } } = await supabase.auth.getUser();
                                  await createSolicitacao.mutateAsync({
                                    regional_id: osRegionalId,
                                    os_id: os.id,
                                    solicitante_id: currentUser?.id || "",
                                    valor_os: valorOS,
                                    saldo_contrato: saldoContrato ?? 0,
                                    saldo_orcamento: saldoOrc ?? 0,
                                    motivo: motivoSolicitacao.trim(),
                                  });
                                  toast.success("Solicitação de crédito suplementar enviada ao Gestor Nacional!");
                                  setShowSolicitacao(false);
                                  setMotivoSolicitacao("");
                                } catch (err: any) {
                                  toast.error("Erro: " + err.message);
                                }
                              }}
                            >
                              {createSolicitacao.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enviar Solicitação
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {bloqueado && isGestorNacional && (
                        <div className="rounded-md border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-3">
                          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" /> Atenção: Saldo insuficiente
                          </p>
                          <p className="text-xs text-foreground mt-1">
                            Como Gestor Nacional, você pode autorizar mesmo com saldo insuficiente.
                          </p>
                        </div>
                      )}
                      <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Autorizar Execução
                      </Button>
                    </>
                  )}
                </div>
              </>
            );
          })()}

          {/* (orcamento section now merged into aberta above) */}

          {/* EXECUCAO → ATESTE: preposto/terceirizado submits evidence */}
          {canAdvance && nextStatus === "ateste" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Camera className="h-4 w-4" /> Execução — Submeter para Ateste
                </h4>
                <p className="text-sm text-muted-foreground">
                  Certifique-se de que as fotos e evidências da execução foram carregadas antes de submeter.
                </p>
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submeter para Ateste
                </Button>
              </div>
            </>
          )}

          {/* ATESTE → PAGAMENTO: gestor/fiscal/operador approves OR preposto/terceirizado resubmits after restitution */}
          {canAdvance && nextStatus === "pagamento" && (
            <>
              <Separator />
              <div className="space-y-3">
                {(isPreposto || isTerceirizado) && !!(os as any).motivo_restituicao ? (
                  <>
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Upload className="h-4 w-4" /> Reenviar Documentos de Pagamento
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Anexe os documentos corrigidos e encaminhe novamente para pagamento.
                    </p>
                    {(os as any).valor_orcamento > 0 && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">
                          <span className="text-muted-foreground">Valor da OS (Orçamento):</span>{" "}
                          <span className="text-foreground font-semibold">
                            R$ {Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => setDocumentosPagamento(e.target.files)}
                    />
                    <Button
                      onClick={async () => {
                        if (documentosPagamento && documentosPagamento.length > 0) {
                          setUploading(true);
                          try {
                            const urls: string[] = [];
                            for (const file of Array.from(documentosPagamento)) {
                              const url = await uploadFile(file, "pagamento");
                              urls.push(url);
                            }
                            const existing = (os as any).documentos_pagamento || [];
                            await updateOS.mutateAsync({
                              id: os.id,
                              status: "pagamento" as any,
                              documentos_pagamento: [...existing, ...urls],
                              motivo_restituicao: null,
                            } as any);
                            toast.success("Documentos reenviados e OS encaminhada para pagamento!");
                            // Notify gestor/fiscal about resubmission (they need to review)
                            const emailOk3 = await sendTransitionNotification(os.status, "ateste");
                            if (!emailOk3) toast.warning("A notificação por e-mail pode não ter sido enviada.", { duration: 8000 });
                            setDocumentosPagamento(null);
                            onOpenChange(false);
                          } catch (err: any) {
                            toast.error("Erro: " + err.message);
                          } finally {
                            setUploading(false);
                          }
                        } else {
                          // Advance without new docs
                          await handleAdvanceStatus();
                        }
                      }}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar e Encaminhar para Pagamento
                    </Button>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Ateste do Serviço
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Aprove a execução do serviço e autorize a emissão da nota fiscal.
                    </p>
                    <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aprovar e Autorizar Emissão da Nota Fiscal
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {/* PAGAMENTO: upload payment documents */}
          {canSubmitPayment && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Pagamento — Documentos
                </h4>
                <p className="text-sm text-muted-foreground">
                  Carregue a nota fiscal, certidões e demais documentos necessários.
                </p>
                {(os as any).valor_orcamento > 0 && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">Valor da OS (Orçamento):</span>{" "}
                      <span className="text-foreground font-semibold">
                        R$ {Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>
                )}
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => setDocumentosPagamento(e.target.files)}
                />
                <Button onClick={handleSubmitPaymentDocs} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Documentos de Pagamento
                </Button>
              </div>
            </>
          )}

          {/* PAGAMENTO: gestor/fiscal generates report and encerras OS */}
          {os.status === "pagamento" && paymentDocs.length > 0 && isGestorOrFiscal && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Encerrar OS e Gerar Relatório
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ao confirmar, a OS será encerrada e um relatório PDF será gerado com todos os detalhes do fluxo, incluindo valor global atestado e responsáveis por cada etapa.
                </p>
                <Button
                  onClick={async () => {
                    setUploading(true);
                    try {
                      // Fetch contract details
                      let contrato = null;
                      if (os.contrato_id) {
                        const { data } = await supabase
                          .from("contratos")
                          .select("numero, empresa, preposto_nome")
                          .eq("id", os.contrato_id)
                          .single();
                        contrato = data;
                      }

                      // Fetch responsáveis names from profiles
                      const responsavelIds = [
                        os.solicitante_id,
                        os.responsavel_id,
                        os.responsavel_execucao_id,
                        os.responsavel_encerramento_id,
                      ].filter(Boolean) as string[];

                      const uniqueIds = [...new Set(responsavelIds)];
                      let profileMap: Record<string, string> = {};
                      if (uniqueIds.length > 0) {
                        const { data: profiles } = await supabase
                          .from("profiles")
                          .select("user_id, full_name")
                          .in("user_id", uniqueIds);
                        if (profiles) {
                          profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
                        }
                      }

                      // Also check contato names for responsáveis that are contato IDs
                      const contatoIds = [
                        os.responsavel_execucao_id,
                        os.responsavel_encerramento_id,
                      ].filter(Boolean) as string[];
                      
                      if (contatoIds.length > 0) {
                        const { data: contatosData } = await supabase
                          .from("contrato_contatos")
                          .select("id, nome")
                          .in("id", contatoIds);
                        if (contatosData) {
                          contatosData.forEach(c => {
                            if (!profileMap[c.id]) profileMap[c.id] = c.nome;
                          });
                        }
                      }

                      const getName = (id: string | null) => id ? (profileMap[id] || "Não identificado") : "—";

                      // Get current user name
                      const { data: { user } } = await supabase.auth.getUser();
                      const { data: currentProfile } = await supabase
                        .from("profiles")
                        .select("full_name")
                        .eq("user_id", user?.id || "")
                        .single();
                      const geradoPorNome = currentProfile?.full_name || "Não identificado";

                      const responsaveis = [
                        { etapa: "Solicitante", nome: getName(os.solicitante_id) },
                        ...(os.responsavel_id ? [{ etapa: "Responsável", nome: getName(os.responsavel_id) }] : []),
                        ...(os.responsavel_execucao_id ? [{ etapa: "Execução", nome: getName(os.responsavel_execucao_id) }] : []),
                        ...(os.responsavel_encerramento_id ? [{ etapa: "Encerramento", nome: getName(os.responsavel_encerramento_id) }] : []),
                      ];

                      const valorAtestado = Number((os as any).valor_orcamento) || 0;

                      // Fetch audit logs (status changes & restitutions)
                      const { data: auditLogs } = await supabase
                        .from("audit_logs")
                        .select("action, description, created_at, user_id")
                        .eq("record_id", os.id)
                        .eq("table_name", "ordens_servico")
                        .in("action", ["STATUS_CHANGE", "restituicao"])
                        .order("created_at", { ascending: true });

                      // Resolve audit log user names
                      const auditUserIds = [...new Set((auditLogs || []).map(l => l.user_id).filter(Boolean))] as string[];
                      let auditProfileMap: Record<string, string> = {};
                      if (auditUserIds.length > 0) {
                        const { data: auditProfiles } = await supabase
                          .from("profiles")
                          .select("user_id, full_name")
                          .in("user_id", auditUserIds);
                        if (auditProfiles) {
                          auditProfileMap = Object.fromEntries(auditProfiles.map(p => [p.user_id, p.full_name]));
                        }
                      }

                      const historicoFluxo = (auditLogs || []).map(log => ({
                        acao: log.action === "restituicao" ? "Restituição" : "Avanço de Status",
                        descricao: log.description || "",
                        data: new Date(log.created_at).toLocaleString("pt-BR"),
                        usuario: log.user_id ? (auditProfileMap[log.user_id] || "Não identificado") : "Sistema",
                      }));

                      // Generate PDF report
                      generateOSReport({
                        os,
                        contrato,
                        custos: custos.data?.map(c => ({ descricao: c.descricao, tipo: c.tipo, valor: Number(c.valor) })) || [],
                        responsaveis,
                        valorAtestado,
                        geradoPor: geradoPorNome,
                        historicoFluxo,
                      });

                      // Get regional_id
                      const uopData = os.uops as any;
                      const regionalId = (os as any).regional_id || uopData?.delegacias?.regional_id || null;

                      // Save report record to DB
                      await supabase.from("relatorios_os").insert({
                        os_id: os.id,
                        codigo_os: os.codigo,
                        titulo_os: os.titulo,
                        valor_atestado: valorAtestado,
                        gerado_por_id: user?.id || "",
                        regional_id: regionalId,
                        contrato_numero: contrato?.numero || null,
                        contrato_empresa: contrato?.empresa || null,
                        dados_json: {
                          contrato,
                          responsaveis,
                          gerado_por_nome: geradoPorNome,
                          historicoFluxo,
                        },
                      });

                      // Update status to encerrada
                      await updateOS.mutateAsync({
                        id: os.id,
                        status: "encerrada" as any,
                        data_encerramento: new Date().toISOString(),
                        responsavel_encerramento_id: user?.id,
                      });

                      // Notify preposto about closure
                      const emailOk4 = await sendTransitionNotification("pagamento", "encerrada");
                      if (!emailOk4) toast.warning("A notificação por e-mail pode não ter sido enviada.", { duration: 8000 });

                      toast.success("OS encerrada e relatório gerado!");
                      onOpenChange(false);
                    } catch (err: any) {
                      toast.error("Erro: " + err.message);
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Download className="mr-2 h-4 w-4" />
                  Encerrar OS e Gerar Relatório PDF
                </Button>
              </div>
            </>
          )}

          {/* RESTITUIR: gestor/fiscal can revert to previous stage */}
          {isGestorOrFiscal && currentIdx > 0 && os.status !== "encerrada" && (
            <>
              <Separator />
              <div className="space-y-3">
                {!showRestituir ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowRestituir(true)}
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Restituir para Fase Anterior
                  </Button>
                ) : (
                  <>
                    <h4 className="text-sm font-medium flex items-center gap-1 text-destructive">
                      <Undo2 className="h-4 w-4" /> Restituir OS para: {statusLabels[statusFlow[currentIdx - 1]]}
                    </h4>
                    <div className="space-y-1.5">
                      <Label>Motivo da restituição *</Label>
                      <Textarea
                        value={motivoRestituicao}
                        onChange={(e) => setMotivoRestituicao(e.target.value)}
                        placeholder="Descreva o motivo para retornar a OS à fase anterior..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => { setShowRestituir(false); setMotivoRestituicao(""); }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!motivoRestituicao.trim() || uploading}
                        className="flex-1"
                        onClick={async () => {
                          setUploading(true);
                          try {
                            const prevStatus = statusFlow[currentIdx - 1];
                            await updateOS.mutateAsync({
                              id: os.id,
                              status: prevStatus as any,
                              motivo_restituicao: motivoRestituicao.trim(),
                            } as any);
                            // Log the revert in audit
                            await supabase.from("audit_logs").insert({
                              table_name: "ordens_servico",
                              action: "restituicao",
                              record_id: os.id,
                              description: `OS ${os.codigo} restituída de ${statusLabels[os.status]} para ${statusLabels[prevStatus]}. Motivo: ${motivoRestituicao.trim()}`,
                            });
                            // Notify responsible party about restitution
                            const emailOk5 = await sendTransitionNotification(os.status, prevStatus, motivoRestituicao.trim());
                            if (!emailOk5) toast.warning("A notificação por e-mail pode não ter sido enviada.", { duration: 8000 });
                            toast.success(`OS restituída para ${statusLabels[prevStatus]}`);
                            setShowRestituir(false);
                            setMotivoRestituicao("");
                            onOpenChange(false);
                          } catch (err: any) {
                            toast.error("Erro: " + err.message);
                          } finally {
                            setUploading(false);
                          }
                        }}
                      >
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Restituição
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
