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
import { useContratos } from "@/hooks/useContratos";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, DollarSign, User, FileText, Upload, CheckCircle, Download, Undo2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { generateOSReport } from "@/utils/generateOSReport";
import { useQuery } from "@tanstack/react-query";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", triagem: "Triagem", orcamento: "Orçamento", autorizacao: "Aguardando Autorização",
  execucao: "Execução", ateste: "Ateste", pagamento: "Pagamento", encerrada: "Encerrada",
};
const statusFlow = ["aberta", "triagem", "orcamento", "autorizacao", "execucao", "ateste", "pagamento", "encerrada"];
const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  triagem: "bg-warning text-warning-foreground",
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

  const { data: contratosAll = [] } = useContratos();
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
    setValorOrcamento("");
    setArquivoOrcamento(null);
    setDocumentosPagamento(null);
  }, [os?.id, os?.contrato_id]);

  if (!os) return null;

  const currentIdx = statusFlow.indexOf(os.status);
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

  // Permission logic per step
  const canAdvance = (() => {
    if (!nextStatus) return false;
    switch (nextStatus) {
      case "triagem": return isGestorOrFiscal; // vincular contrato
      case "orcamento": return isGestorOrFiscal; // after triagem, move to orcamento
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

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;

    // Validation for triagem: must link contract
    if (nextStatus === "triagem" && !selectedContratoId) {
      toast.error("Vincule um contrato antes de avançar para Triagem");
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

      if (nextStatus === "triagem") {
        updates.contrato_id = selectedContratoId;
      }

      if (nextStatus === "autorizacao" && arquivoOrcamento) {
        const url = await uploadFile(arquivoOrcamento, "orcamentos");
        updates.arquivo_orcamento = url;
        updates.valor_orcamento = parseFloat(valorOrcamento);
      }

      await updateOS.mutateAsync(updates);
      toast.success(`Status alterado para ${statusLabels[nextStatus]}`);

      // Notify preposto when advancing to triagem
      if (nextStatus === "triagem" && selectedContratoId) {
        try {
          await supabase.functions.invoke("notify-preposto", {
            body: { os_id: os.id, contrato_id: selectedContratoId, app_url: window.location.origin },
          });
          toast.success("Email enviado ao preposto para definir responsável");
        } catch {
          toast.warning("OS avançada, mas não foi possível notificar o preposto");
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
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
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

          {/* TRIAGEM: vincular contrato */}
          {canAdvance && nextStatus === "triagem" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Triagem — Vincular Contrato</h4>
                <Select value={selectedContratoId || "none"} onValueChange={(v) => setSelectedContratoId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contratosAll
                      .filter((c) => {
                        const hoje = new Date();
                        return hoje >= new Date(c.data_inicio) && hoje <= new Date(c.data_fim);
                      })
                      .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.numero} — {c.empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Avançar para Triagem
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

          {/* AUTORIZACAO → EXECUCAO: gestor/fiscal authorizes */}
          {canAdvance && nextStatus === "execucao" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Autorização para Execução
                </h4>
                {(os as any).arquivo_orcamento && (
                  <div className="text-sm p-3 bg-muted rounded-md space-y-1">
                    <p><span className="text-muted-foreground">Orçamento:</span> R$ {Number((os as any).valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <a href={(os as any).arquivo_orcamento} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                      Ver arquivo do orçamento
                    </a>
                  </div>
                )}
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Autorizar Execução
                </Button>
              </div>
            </>
          )}

          {/* Move to orcamento (after triagem) */}
          {canAdvance && nextStatus === "orcamento" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Encaminhar para Orçamento</h4>
                <p className="text-sm text-muted-foreground">Após a triagem, encaminhe a OS para que o preposto/terceirizado elabore o orçamento.</p>
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Encaminhar para Orçamento
                </Button>
              </div>
            </>
          )}

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
                      Aprove a execução do serviço e autorize o pagamento.
                    </p>
                    <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aprovar e Autorizar Pagamento
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
                        os.responsavel_triagem_id,
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
                        os.responsavel_triagem_id,
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
                        ...(os.responsavel_triagem_id ? [{ etapa: "Triagem", nome: getName(os.responsavel_triagem_id) }] : []),
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
