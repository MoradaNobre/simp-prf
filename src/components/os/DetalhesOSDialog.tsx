import { useState, useEffect, useCallback, useMemo } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useNavigate } from "react-router-dom";
import { isAdminRole, isFiscalRole } from "@/utils/roles";
import { getStatusFlowForTipo, bypassesContractBalance, bypassesBudgetBlocking, tipoServicoLabel } from "@/utils/modalidade";
import { OSStatusStepper } from "@/components/os/OSStatusStepper";

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
import { useLimitesModalidade } from "@/hooks/useLimitesModalidade";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { monitoredInvoke } from "@/utils/monitoredInvoke";
import { toast } from "sonner";
import { Loader2, Camera, DollarSign, User, FileText, Upload, CheckCircle, Download, Undo2, AlertTriangle, ShieldAlert, FilePlus2, Archive, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { generateOSReport } from "@/utils/generateOSReport";
import { generateOSExecucaoReport } from "@/utils/generateOSExecucaoReport";
import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";
import { OSAgendamentosTab } from "@/components/os/OSAgendamentosTab";
import { OSHistoricoTimeline } from "@/components/os/OSHistoricoTimeline";
import { useSolicitacoesPrazo, useCreateSolicitacaoPrazo, useRespondSolicitacaoPrazo } from "@/hooks/useSolicitacoesPrazo";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguardando Autorização",
  execucao: "Execução", ateste: "Receb. Serviço", faturamento: "Faturamento", pagamento: "Ateste", encerrada: "Encerrada",
};
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
  faturamento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pagamento: "bg-success text-success-foreground",
  encerrada: "bg-muted text-muted-foreground",
};

interface Props {
  os: OrdemServico | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalhesOSDialog({ os, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const updateOS = useUpdateOS();
  const custos = useOSCustos(os?.id);
  const addCusto = useAddCusto();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  
  const isGestorOrFiscal = isAdminRole(role) || role === "gestor_regional" || isFiscalRole(role);
  const isPreposto = role === "preposto";
  const isTerceirizado = role === "terceirizado";
  const isOperador = role === "operador";
  const isSuprido = !!profile?.is_suprido;

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
  const [selectedTipo, setSelectedTipo] = useState("");
  const [descricaoDetalhada, setDescricaoDetalhada] = useState("");
  const [motivoSolicitacao, setMotivoSolicitacao] = useState("");
  const [showSolicitacao, setShowSolicitacao] = useState(false);
  const [prazoOrcamento, setPrazoOrcamento] = useState("");
  const [prazoExecucao, setPrazoExecucao] = useState("");
  const [relatorioExecucao, setRelatorioExecucao] = useState<File | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showSolicitarPrazo, setShowSolicitarPrazo] = useState(false);
  const [prazoSolicitado, setPrazoSolicitado] = useState("");
  const [justificativaPrazo, setJustificativaPrazo] = useState("");
  const [respostaPrazo, setRespostaPrazo] = useState("");
  const [prazoAprovado, setPrazoAprovado] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [arquivoImr, setArquivoImr] = useState<File | null>(null);

  // Signed URLs for secure file display
  const signedFotoAntes = useSignedUrl(os?.foto_antes);
  const signedFotoDepois = useSignedUrl(os?.foto_depois);
  const signedArquivoOrcamento = useSignedUrl((os as any)?.arquivo_orcamento);
  const signedRelatorioExecucao = useSignedUrl((os as any)?.relatorio_execucao_preposto);
  const signedArquivoImr = useSignedUrl((os as any)?.arquivo_imr);

  // Deadline extension requests
  const solicitacoesPrazo = useSolicitacoesPrazo(os?.id);
  const createSolicitacaoPrazo = useCreateSolicitacaoPrazo();
  const respondSolicitacaoPrazo = useRespondSolicitacaoPrazo();

/** Small component to render payment doc links with signed URLs */
function PaymentDocLinks({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    import("@/utils/storage").then(({ getSignedUrls }) => {
      getSignedUrls(paths).then(setUrls);
    });
  }, [paths]);
  return (
    <div className="space-y-1">
      {urls.map((url, i) => url ? (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary underline">
          <FileText className="h-3 w-3" /> Documento {i + 1}
        </a>
      ) : (
        <span key={i} className="text-xs text-muted-foreground">Carregando documento {i + 1}...</span>
      ))}
    </div>
  );
    }

  // Check if this OS was created from chamados
  const { data: linkedChamados = [] } = useQuery({
    queryKey: ["os-linked-chamados-detalhes", os?.id],
    queryFn: async () => {
      if (!os) return [];
      const { data } = await supabase
        .from("chamados")
        .select("id, gut_score")
        .eq("os_id", os.id);
      return data || [];
    },
    enabled: !!os?.id,
  });
  const hasLinkedChamados = linkedChamados.length > 0;

  const { data: contratosAll = [] } = useContratos();
  const { data: saldos = [] } = useContratosSaldo();

  // Budget data for authorization blocking
  const osRegionalId = (os as any)?.regional_id;
  const { data: saldoOrcamento } = useSaldoOrcamentarioRegional(osRegionalId);
  const createSolicitacao = useCreateSolicitacaoCredito();
  const contratoId = os?.contrato_id;

  // Limite de modalidade: fetch limit and consumed amount for cartao_corporativo / contrata_brasil
  const contratoForModalidade = contratosAll.find(c => c.id === os?.contrato_id);
  const tipoServicoForQuery = contratoForModalidade?.tipo_servico;
  const isModalidadeEspecial = tipoServicoForQuery === "cartao_corporativo" || tipoServicoForQuery === "contrata_brasil";
  const currentYear = new Date().getFullYear();
  
  const { data: limitesModalidade = [] } = useLimitesModalidade(osRegionalId, currentYear);
  
  // Sum of valor_orcamento from OS already past orcamento (autorizacao+) for same modalidade/regional/year
  const { data: consumoModalidade } = useQuery({
    queryKey: ["consumo-modalidade", osRegionalId, tipoServicoForQuery, currentYear, os?.id],
    queryFn: async () => {
      if (!osRegionalId || !tipoServicoForQuery) return 0;
      // Get all contrato IDs with this tipo_servico in this regional
      const { data: contratos, error: cErr } = await supabase
        .from("contratos")
        .select("id")
        .eq("regional_id", osRegionalId)
        .eq("tipo_servico", tipoServicoForQuery);
      if (cErr) throw cErr;
      if (!contratos || contratos.length === 0) return 0;
      const contratoIds = contratos.map(c => c.id);
      
      // Get OS linked to these contracts, past orçamento stage, in current year, excluding current OS
      const { data: osList, error: oErr } = await supabase
        .from("ordens_servico")
        .select("valor_orcamento")
        .in("contrato_id", contratoIds)
        .gte("data_abertura", `${currentYear}-01-01`)
        .lt("data_abertura", `${currentYear + 1}-01-01`)
        .not("status", "in", '("aberta","orcamento")');
      if (oErr) throw oErr;
      
      // Sum values, excluding current OS
      const total = (osList || [])
        .reduce((sum, o) => sum + (Number(o.valor_orcamento) || 0), 0);
      return total;
    },
    enabled: !!osRegionalId && isModalidadeEspecial,
  });
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
    setSelectedTipo(os?.tipo ?? "corretiva");
    setDescricaoDetalhada("");
    setValorOrcamento("");
    setArquivoOrcamento(null);
    setDocumentosPagamento(null);
    setPrazoOrcamento((os as any)?.prazo_orcamento ?? "");
    setPrazoExecucao((os as any)?.prazo_execucao ?? "");
  }, [os?.id, os?.contrato_id, os?.prioridade, os?.tipo]);

  // Compute motivo_bloqueio and sync to DB via useEffect (NOT during render)
  const computedMotivoBloqueio = useMemo(() => {
    if (!os || os.status !== "autorizacao") return undefined; // undefined = skip sync
    const valorOS = Number(os.valor_orcamento) || 0;
    const saldoContrato = (() => {
      const s = saldos.find((x: any) => x.id === os.contrato_id);
      return s ? Number((s as any).saldo) : null;
    })();
    const saldoOrc = saldoOrcamento?.saldo_disponivel ?? null;
    const contratoInfo = contratosAll.find(c => c.id === os.contrato_id);
    const tipo = contratoInfo?.tipo_servico;
    const skipContractBalance = bypassesContractBalance(tipo);
    const skipBudgetBlock = bypassesBudgetBlocking(tipo);
    const contratoInsuficiente = !skipContractBalance && saldoContrato !== null && saldoContrato < valorOS;
    const orcamentoInsuficiente = !skipBudgetBlock && saldoOrc !== null && saldoOrc < valorOS;
    const semOrcamentoCadastrado = !skipBudgetBlock && saldoOrc === null;
    const saldoEmpenhado = saldoOrcamento?.saldo_empenhado ?? 0;
    const skipEmpenhoCheck = !skipBudgetBlock && (semOrcamentoCadastrado || orcamentoInsuficiente);
    const empenhoInsuficiente = !skipEmpenhoCheck && saldoEmpenhado < valorOS;

    const isModalidade = tipo === "cartao_corporativo" || tipo === "contrata_brasil";
    const limiteM = isModalidade ? limitesModalidade.find(l => l.modalidade === tipo) : null;
    const valorLim = limiteM ? Number(limiteM.valor_limite) : null;
    const consumo = consumoModalidade ?? 0;
    const consumoSemAtual = consumo - valorOS; // OS is in autorizacao, so it's already counted
    const limiteExcedido = isModalidade && valorLim !== null && (consumoSemAtual + valorOS) > valorLim;
    const semLimite = isModalidade && valorLim === null;

    const bloqueio1 = orcamentoInsuficiente || semOrcamentoCadastrado;
    const bloqueio2c = !bloqueio1 && contratoInsuficiente;
    const bloqueio2l = !bloqueio1 && !bloqueio2c && (limiteExcedido || semLimite);
    const bloqueio3 = !bloqueio1 && !bloqueio2c && !bloqueio2l && empenhoInsuficiente;

    if (bloqueio1) return semOrcamentoCadastrado ? "sem_cota_cadastrada" : "cota_regional_insuficiente";
    if (bloqueio2c) return "saldo_contrato_insuficiente";
    if (bloqueio2l) return "limite_modalidade_excedido";
    if (bloqueio3) return "empenho_insuficiente";
    return null;
  }, [os?.id, os?.status, os?.valor_orcamento, os?.contrato_id, saldos, saldoOrcamento, contratosAll, limitesModalidade, consumoModalidade]);

  useEffect(() => {
    if (computedMotivoBloqueio === undefined || !os) return; // not in autorizacao or no OS
    const currentMotivo = os.motivo_bloqueio ?? null;
    if (computedMotivoBloqueio !== currentMotivo) {
      updateOS.mutate({ id: os.id, motivo_bloqueio: computedMotivoBloqueio } as any);
    }
  }, [computedMotivoBloqueio]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!os) return null;

  const contratoLinked = contratosAll.find(c => c.id === os.contrato_id);
  const tipoServico = contratoLinked?.tipo_servico;
  const isCartaoCorporativo = tipoServico === "cartao_corporativo";
  const isSupridoOnCartao = isSuprido && isCartaoCorporativo;
  const statusFlow = getStatusFlowForTipo(tipoServico);
  const currentIdx = statusFlow.indexOf(os.status);
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

  // Permission logic per step
  const canAdvance = (() => {
    if (!nextStatus) return false;
    // For cartao_corporativo: ateste → encerrada (gestor/fiscal/operador)
    if (nextStatus === "encerrada" && os.status === "ateste") {
      return isGestorOrFiscal || isOperador;
    }
    switch (nextStatus) {
      case "orcamento": return isGestorOrFiscal; // vincular contrato e encaminhar
      case "autorizacao": return isPreposto || isTerceirizado || isSupridoOnCartao; // upload budget (suprido acts as preposto for cartão)
      case "execucao": return isGestorOrFiscal; // authorize execution
      case "ateste": return isPreposto || isTerceirizado || isSupridoOnCartao; // submit execution evidence
      case "faturamento": return isGestorOrFiscal || isOperador; // approve ateste → authorize NF emission
      case "pagamento": return isPreposto || isTerceirizado; // preposto uploads NF and certidões
      default: return false;
    }
  })();

  // Can submit payment docs (encerramento step)
  const canSubmitPayment = os.status === "pagamento" && isGestorOrFiscal;

  const uploadFile = async (file: File, folder: string) => {
    const { uploadToStorage } = await import("@/utils/storage");
    return uploadToStorage(file, folder);
  };

  const sendTransitionNotification = async (fromStatus: string, toStatus: string, motivoRestituicao?: string): Promise<boolean> => {
    try {
      const { data: notifyData, error: notifyError } = await monitoredInvoke("notify-os-transition", {
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

    // Validation for orcamento: must link contract and set prazo
    if (nextStatus === "orcamento" && !selectedContratoId) {
      toast.error("Vincule um contrato antes de encaminhar para Orçamento");
      return;
    }
    if (nextStatus === "orcamento" && !prazoOrcamento) {
      toast.error("Defina o prazo para apresentação do orçamento");
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

    // Validation for ateste: must upload execution report
    if (nextStatus === "ateste" && !relatorioExecucao && !(os as any).relatorio_execucao_preposto) {
      toast.error("Anexe o relatório de execução do serviço antes de submeter para ateste");
      return;
    }

    setUploading(true);
    try {
      const updates: any = { id: os.id, status: nextStatus, motivo_restituicao: null };

      if (nextStatus === "orcamento") {
        if (selectedContratoId) updates.contrato_id = selectedContratoId;
        if (selectedPrioridade && selectedPrioridade !== os.prioridade) {
          updates.prioridade = selectedPrioridade;
        }
        if (selectedTipo && selectedTipo !== os.tipo) {
          updates.tipo = selectedTipo;
        }
        if (descricaoDetalhada.trim()) {
          const existing = os.descricao || "";
          const separator = existing ? "\n\n--- Descrição complementar ---\n" : "";
          updates.descricao = existing + separator + descricaoDetalhada.trim();
        }
        if (prazoOrcamento) {
          updates.prazo_orcamento = prazoOrcamento;
        }
      }

      if (nextStatus === "autorizacao" && arquivoOrcamento) {
        const url = await uploadFile(arquivoOrcamento, "orcamentos");
        updates.arquivo_orcamento = url;
        updates.valor_orcamento = parseFloat(valorOrcamento);
      }

      // Save prazo_execucao when authorizing execution
      if (nextStatus === "execucao") {
        if (!prazoExecucao) {
          toast.error("Defina o prazo para conclusão da execução");
          setUploading(false);
          return;
        }
        updates.prazo_execucao = prazoExecucao;
      }

      // Upload execution report when advancing to ateste
      if (nextStatus === "ateste" && relatorioExecucao) {
        const url = await uploadFile(relatorioExecucao, "relatorios-execucao");
        updates.relatorio_execucao_preposto = url;
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

          // Fetch linked chamados for report
          const { data: chamadosExec } = await supabase
            .from("chamados")
            .select("codigo, tipo_demanda, local_servico, gut_score")
            .eq("os_id", os.id);

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
            prazoExecucao: (os as any).prazo_execucao ? new Date((os as any).prazo_execucao).toLocaleDateString("pt-BR") : undefined,
            fiscalNome: fiscalProfile?.full_name || undefined,
            prioridade: os.prioridade,
            chamados: (chamadosExec || []).map((ch: any) => ({
              codigo: ch.codigo,
              gut_score: ch.gut_score,
              tipo_demanda: ch.tipo_demanda,
              local_servico: ch.local_servico,
            })),
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

            await monitoredInvoke("send-os-execucao", {
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

  const handleDownloadZip = async () => {
    if (!os) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const fetchFile = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const blob = await res.blob();
          zip.file(name, blob);
        } catch { /* skip files that fail */ }
      };

      // Collect all attachments using signed URLs
      const { getSignedUrl: signUrl } = await import("@/utils/storage");
      const promises: Promise<void>[] = [];

      if (os.foto_antes) {
        promises.push((async () => {
          const signed = await signUrl(os.foto_antes!);
          if (signed) await fetchFile(signed, `foto_antes.jpg`);
        })());
      }
      if (os.foto_depois) {
        promises.push((async () => {
          const signed = await signUrl(os.foto_depois!);
          if (signed) await fetchFile(signed, `foto_depois.jpg`);
        })());
      }
      if ((os as any).arquivo_orcamento) {
        promises.push((async () => {
          const signed = await signUrl((os as any).arquivo_orcamento);
          if (signed) await fetchFile(signed, `orcamento.pdf`);
        })());
      }

      // Payment documents
      const docs: string[] = (os as any).documentos_pagamento || [];
      docs.forEach((path, i) => {
        promises.push((async () => {
          const signed = await signUrl(path);
          if (signed) await fetchFile(signed, `pagamento/documento_${i + 1}.pdf`);
        })());
      });

      // Fetch and add reports as PDFs
      // Relatório de Pagamento (relatorios_os)
      const { data: relatoriosOs } = await supabase
        .from("relatorios_os")
        .select("*")
        .eq("os_id", os.id);

      if (relatoriosOs?.length) {
        for (const rel of relatoriosOs) {
          try {
            const dados = rel.dados_json as any;
            const { data: osData } = await supabase
              .from("ordens_servico")
              .select("*, uops(nome, delegacia_id, delegacias(nome, regional_id, regionais(sigla, nome))), regionais(sigla, nome)")
              .eq("id", rel.os_id)
              .single();
            const { data: custosData } = await supabase
              .from("os_custos")
              .select("descricao, tipo, valor")
              .eq("os_id", rel.os_id);
            const { data: chData } = await supabase
              .from("chamados")
              .select("codigo, tipo_demanda, local_servico, descricao, gut_gravidade, gut_urgencia, gut_tendencia, gut_score, prioridade, created_at, status")
              .eq("os_id", rel.os_id);

            const pdfDoc = generateOSReport({
              os: osData as any,
              contrato: dados.contrato || null,
              custos: (custosData || []).map((c: any) => ({ descricao: c.descricao, tipo: c.tipo, valor: Number(c.valor) })),
              responsaveis: dados.responsaveis || [],
              valorAtestado: rel.valor_atestado,
              geradoPor: dados.gerado_por_nome || "",
              historicoFluxo: dados.historicoFluxo || [],
              chamados: (chData || []).map((ch: any) => ({ ...ch, solicitante_nome: "—" })),
            }, { skipSave: true });
            const pdfBlob = pdfDoc.output("blob");
            zip.file(`relatorio_pagamento_${rel.codigo_os}.pdf`, pdfBlob);
          } catch { /* skip */ }
        }
      }

      // Relatório de Execução (relatorios_execucao)
      const { data: relatoriosExec } = await supabase
        .from("relatorios_execucao")
        .select("*")
        .eq("os_id", os.id);

      if (relatoriosExec?.length) {
        for (const rel of relatoriosExec) {
          try {
            const reportData = rel.dados_json as any;
            const pdfDoc = generateOSExecucaoReport(reportData);
            const pdfBlob = pdfDoc.output("blob");
            zip.file(`relatorio_execucao_${rel.codigo_os}.pdf`, pdfBlob);
          } catch { /* skip */ }
        }
      }

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `OS_${os.codigo}_documentos.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Download concluído!");
    } catch (err: any) {
      toast.error("Erro ao gerar ZIP: " + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  const totalCustos = (custos.data || []).reduce((sum, c) => sum + Number(c.valor), 0);
  const paymentDocs: string[] = (os as any).documentos_pagamento || [];

  // Status stepper - now uses the chevron component

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
          <OSStatusStepper currentStatus={os.status} tipoServico={tipoServico} />

          {/* Status & Priority */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={prioridadeColors[os.prioridade] as any}>
              {prioridadeLabels[os.prioridade]}
            </Badge>
            <Badge variant="outline">{os.tipo === "corretiva" ? "Corretiva" : "Preventiva"}</Badge>
            {tipoServico && (tipoServico === "cartao_corporativo" || tipoServico === "contrata_brasil") && (
              <Badge variant="secondary">{tipoServicoLabel(tipoServico)}</Badge>
            )}
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

          {/* Deadline info and overdue warnings */}
          {(() => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const prazoOrc = (os as any).prazo_orcamento ? new Date((os as any).prazo_orcamento + "T23:59:59") : null;
            const prazoExec = (os as any).prazo_execucao ? new Date((os as any).prazo_execucao + "T23:59:59") : null;
            const orcVencido = prazoOrc && hoje > prazoOrc && os.status === "orcamento";
            const execVencido = prazoExec && hoje > prazoExec && os.status === "execucao";
            const showPrazoOrc = prazoOrc && ["orcamento", "autorizacao", "execucao", "ateste", "faturamento", "pagamento", "encerrada"].includes(os.status);
            const showPrazoExec = prazoExec && ["execucao", "ateste", "faturamento", "pagamento", "encerrada"].includes(os.status);
            
            if (!showPrazoOrc && !showPrazoExec) return null;
            
            return (
              <div className="space-y-2">
                {showPrazoOrc && (
                  <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${orcVencido ? "bg-destructive/10 border border-destructive/50" : "bg-muted/50"}`}>
                    <Clock className={`h-4 w-4 ${orcVencido ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className={orcVencido ? "text-destructive font-medium" : ""}>
                      Prazo Orçamento: {prazoOrc.toLocaleDateString("pt-BR")}
                      {orcVencido && " — VENCIDO"}
                    </span>
                  </div>
                )}
                {showPrazoExec && (
                  <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${execVencido ? "bg-destructive/10 border border-destructive/50" : "bg-muted/50"}`}>
                    <Clock className={`h-4 w-4 ${execVencido ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className={execVencido ? "text-destructive font-medium" : ""}>
                      Prazo Execução: {prazoExec.toLocaleDateString("pt-BR")}
                      {execVencido && " — VENCIDO"}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

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


          {/* Execution report link */}
          {signedRelatorioExecucao && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <a href={signedRelatorioExecucao} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Ver relatório de execução do serviço
              </a>
            </div>
          )}

          {/* IMR link */}
          {signedArquivoImr && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <a href={signedArquivoImr} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Ver IMR — Instrumento de Medição de Resultados
              </a>
            </div>
          )}

          {/* Photos */}
          <div className="grid grid-cols-2 gap-3">
            {os.foto_antes && signedFotoAntes && (
              <div>
                <Label className="text-xs text-muted-foreground">Foto Antes</Label>
                <img src={signedFotoAntes} alt="Antes" className="mt-1 rounded-md border max-h-40 object-cover w-full" />
              </div>
            )}
            {os.foto_depois && signedFotoDepois ? (
              <div>
                <Label className="text-xs text-muted-foreground">Foto Depois</Label>
                <img src={signedFotoDepois} alt="Depois" className="mt-1 rounded-md border max-h-40 object-cover w-full" />
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
              <PaymentDocLinks paths={paymentDocs} />
            </div>
          )}

          {/* Download ZIP: encerrada OS for gestores/fiscais */}
          {os.status === "encerrada" && isGestorOrFiscal && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Archive className="h-4 w-4" /> Download Completo
                </h4>
                <p className="text-sm text-muted-foreground">
                  Baixe todos os arquivos anexados e relatórios gerados desta OS em um único arquivo compactado.
                </p>
                <Button
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  variant="outline"
                  className="w-full"
                >
                  {downloadingZip ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
                  {downloadingZip ? "Gerando arquivo..." : "Baixar Todos os Documentos (.zip)"}
                </Button>
              </div>
            </>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prioridade</Label>
                    {hasLinkedChamados ? (
                      <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
                        {selectedPrioridade.charAt(0).toUpperCase() + selectedPrioridade.slice(1)}
                        <p className="text-xs mt-1">Definida pela Matriz GUT do chamado.</p>
                      </div>
                    ) : (
                      <Select value={selectedPrioridade} onValueChange={setSelectedPrioridade}>
                        <SelectTrigger><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de Manutenção</Label>
                    <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corretiva">Corretiva</SelectItem>
                        <SelectItem value="preventiva">Preventiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição Detalhada</Label>
                  <Textarea
                    value={descricaoDetalhada}
                    onChange={(e) => setDescricaoDetalhada(e.target.value)}
                    placeholder="Complemente a descrição inicial com mais detalhes, se necessário..."
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Prazo para Apresentação do Orçamento *
                  </Label>
                  <Input
                    type="date"
                    value={prazoOrcamento}
                    onChange={(e) => setPrazoOrcamento(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Obrigatório. Defina o prazo limite para que o preposto/terceirizado apresente o orçamento.</p>
                </div>
                <p className="text-sm text-muted-foreground">Vincule o contrato, ajuste o tipo se necessário, e encaminhe para que o preposto/terceirizado elabore o orçamento.</p>
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
            const skipContractBalance = bypassesContractBalance(tipoServico);
            const skipBudgetBlock = bypassesBudgetBlocking(tipoServico);
            const contratoInsuficiente = !skipContractBalance && saldoContrato !== null && saldoContrato < valorOS;
            const orcamentoInsuficiente = !skipBudgetBlock && saldoOrc !== null && saldoOrc < valorOS;
            const semOrcamentoCadastrado = !skipBudgetBlock && saldoOrc === null;
            const totalEmpenhado = saldoOrcamento?.total_empenhos ?? 0;
            const saldoEmpenhado = saldoOrcamento?.saldo_empenhado ?? 0;
            const creditoNaoEmpenhado = saldoOrcamento?.credito_nao_empenhado ?? 0;
            // Empenho is required for ALL modalities including cartão_corporativo
            const skipEmpenhoCheck = !skipBudgetBlock && (semOrcamentoCadastrado || orcamentoInsuficiente);
            const empenhoInsuficiente = !skipEmpenhoCheck && saldoEmpenhado < valorOS;

            // Limite de Modalidade check (for cartao_corporativo / contrata_brasil)
            const limiteModalidade = isModalidadeEspecial
              ? limitesModalidade.find(l => l.modalidade === tipoServico)
              : null;
            const valorLimite = limiteModalidade ? Number(limiteModalidade.valor_limite) : null;
            const consumoAtual = (consumoModalidade ?? 0);
            // Exclude current OS from consumo if it's already counted (status past orcamento)
            const consumoSemAtual = os.status !== "aberta" && os.status !== "orcamento"
              ? consumoAtual - valorOS
              : consumoAtual;
            const consumoComAtual = consumoSemAtual + valorOS;
            const limiteExcedido = isModalidadeEspecial && valorLimite !== null && consumoComAtual > valorLimite;
            const semLimiteCadastrado = isModalidadeEspecial && valorLimite === null;

            // Blocking priority: 1) Cota Regional, 2) Saldo Contrato / Limite Modalidade, 3) Empenho
            const bloqueio1_cota = orcamentoInsuficiente || semOrcamentoCadastrado;
            const bloqueio2_contrato = !bloqueio1_cota && contratoInsuficiente;
            const bloqueio2_limite = !bloqueio1_cota && !bloqueio2_contrato && (limiteExcedido || semLimiteCadastrado);
            const bloqueio3_empenho = !bloqueio1_cota && !bloqueio2_contrato && !bloqueio2_limite && empenhoInsuficiente;
            const bloqueado = bloqueio1_cota || bloqueio2_contrato || bloqueio2_limite || bloqueio3_empenho;

            // Persist motivo_bloqueio to the OS record
            const motivoBloqueioAtual = bloqueio1_cota
              ? (semOrcamentoCadastrado ? "sem_cota_cadastrada" : "cota_regional_insuficiente")
              : bloqueio2_contrato
                ? "saldo_contrato_insuficiente"
                : bloqueio2_limite
                  ? "limite_modalidade_excedido"
                  : bloqueio3_empenho
                    ? "empenho_insuficiente"
                    : null;

            // NOTE: motivo_bloqueio sync is handled in a useEffect above to avoid mutating during render

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
                      {signedArquivoOrcamento && (
                        <a href={signedArquivoOrcamento} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          Ver arquivo do orçamento
                        </a>
                      )}
                    </div>
                  )}

                  {/* 1. Saldo Orçamentário da Regional (Cota) */}
                  <div className={`text-sm p-3 rounded-md border ${bloqueio1_cota ? "border-destructive bg-destructive/10" : semOrcamentoCadastrado ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800" : "bg-muted/50"}`}>
                    <div className="flex items-center gap-2">
                      {bloqueio1_cota ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium">Saldo Orçamentário da Regional</span>
                    </div>
                    {semOrcamentoCadastrado ? (
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1 font-medium">
                        ⚠ Nenhuma cota orçamentária cadastrada para esta regional no exercício atual
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
                            <span className="text-muted-foreground text-xs">Saldo Empenhado</span>
                            <p className={empenhoInsuficiente ? "text-destructive font-medium" : ""}>{saldoEmpenhado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
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

                  {/* 2. Saldo do Contrato — only show if cota is OK */}
                  {!bloqueio1_cota && os.contrato_id && (() => {
                    const c = contratosAll.find(x => x.id === os.contrato_id);
                    const saldoData = saldos.find((x: any) => x.id === os.contrato_id);
                    if (!c || saldoContrato === null) return null;
                    const valorTotalComAditivos = saldoData ? Number((saldoData as any).valor_total_com_aditivos ?? c.valor_total) : c.valor_total;
                    const totalAditivos = saldoData ? Number((saldoData as any).total_aditivos ?? 0) : 0;
                    return (
                      <div className={`text-sm p-3 rounded-md border ${bloqueio2_contrato ? "border-destructive bg-destructive/10" : "bg-muted/50"}`}>
                        <div className="flex items-center gap-2">
                          {bloqueio2_contrato ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium">Saldo do Contrato</span>
                        </div>
                        <p className="mt-1">
                          <span className={saldoContrato < 0 ? "text-destructive font-medium" : ""}>
                            {saldoContrato.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          <span className="text-muted-foreground ml-2">de {valorTotalComAditivos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                          {totalAditivos > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">(inclui aditivos: {totalAditivos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})</span>
                          )}
                        </p>
                        {bloqueio2_contrato && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            ⚠ Saldo do contrato insuficiente para esta OS — considere registrar um aditivo contratual
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* 2b. Limite de Modalidade — for cartao_corporativo / contrata_brasil */}
                  {!bloqueio1_cota && !bloqueio2_contrato && isModalidadeEspecial && (
                    <div className={`text-sm p-3 rounded-md border ${bloqueio2_limite ? "border-destructive bg-destructive/10" : "bg-muted/50"}`}>
                      <div className="flex items-center gap-2">
                        {bloqueio2_limite ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">Limite de Modalidade ({tipoServicoLabel(tipoServico)})</span>
                      </div>
                      {semLimiteCadastrado ? (
                        <p className="text-xs text-destructive mt-1 font-medium">
                          ⚠ Nenhum limite cadastrado para esta modalidade/regional no exercício {currentYear}. Cadastre em Gestão → Limites Modalidade.
                        </p>
                      ) : (
                        <>
                          <div className="mt-1 grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-muted-foreground text-xs">Teto</span>
                              <p>{valorLimite!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Consumido</span>
                              <p>{consumoSemAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Disponível</span>
                              <p className={limiteExcedido ? "text-destructive font-medium" : ""}>
                                {(valorLimite! - consumoSemAtual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                            </div>
                          </div>
                          {limiteExcedido && (
                            <p className="text-xs text-destructive mt-1 font-medium">
                              ⚠ O valor desta OS ({valorOS.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) excede o saldo disponível do limite de modalidade
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* 3. Empenho — only show if cota, contrato and limite are OK */}
                  {!bloqueio1_cota && !bloqueio2_contrato && !bloqueio2_limite && !semOrcamentoCadastrado && (
                    <div className={`text-sm p-3 rounded-md border ${bloqueio3_empenho ? "border-destructive bg-destructive/10" : "bg-muted/50"}`}>
                      <div className="flex items-center gap-2">
                        {bloqueio3_empenho ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <DollarSign className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">Empenho</span>
                      </div>
                      <p className="mt-1">
                        <span className={bloqueio3_empenho ? "text-destructive font-medium" : ""}>
                          {totalEmpenhado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span className="text-muted-foreground ml-2">empenhado de {valorOS.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} necessários</span>
                      </p>
                      {bloqueio3_empenho && (
                        <p className="text-xs text-destructive mt-1 font-medium">
                          ⚠ Valor empenhado insuficiente para esta OS
                        </p>
                      )}
                    </div>
                  )}


                  {/* Actions — show only the first active blocker */}
                  {/* 1º Bloqueio: Cota Regional insuficiente */}
                  {bloqueio1_cota ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Autorização Bloqueada — Cota Regional Insuficiente
                        </p>
                        <p className="text-xs text-foreground mt-1">
                          Não é possível autorizar esta OS pois a cota orçamentária da regional é insuficiente. Solicite acréscimo de cota para prosseguir.
                        </p>
                      </div>

                      {!showSolicitacao ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowSolicitacao(true)}
                          className="w-full"
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Solicitar Acréscimo de Cota
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
                                  toast.success("Solicitação de acréscimo de cota enviada!");
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
                  ) : bloqueio2_contrato ? (
                    /* 2º Bloqueio: Saldo do Contrato insuficiente — bloqueia TODOS */
                    <div className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Autorização Sobrestada — Saldo Contratual Insuficiente
                        </p>
                        <p className="text-xs text-foreground mt-1">
                          O saldo do contrato é insuficiente para esta OS. A autorização permanecerá sobrestada até que o saldo contratual seja suficiente. Registre um aditivo contratual para prosseguir.
                        </p>
                      </div>
                      {isGestorOrFiscal && (
                        <Button
                          variant="outline"
                          onClick={() => { window.open("/app/contratos", "_blank"); }}
                          className="w-full"
                        >
                          <FilePlus2 className="mr-2 h-4 w-4" />
                          Ir para Gestão de Contratos — Registrar Aditivo
                        </Button>
                      )}
                    </div>
                  ) : bloqueio2_limite ? (
                    /* 2bº Bloqueio: Limite de Modalidade excedido */
                    <div className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Autorização Bloqueada — {semLimiteCadastrado ? "Limite de Modalidade Não Cadastrado" : "Limite de Modalidade Excedido"}
                        </p>
                        <p className="text-xs text-foreground mt-1">
                          {semLimiteCadastrado
                            ? `Não há limite cadastrado para a modalidade "${tipoServicoLabel(tipoServico)}" nesta regional para o exercício ${currentYear}. Cadastre o limite em Gestão do Sistema → Limites Modalidade.`
                            : `O consumo acumulado (${consumoSemAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) + esta OS (${valorOS.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) = ${consumoComAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ultrapassa o teto de ${valorLimite!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
                          }
                        </p>
                      </div>
                      {isGestorOrFiscal && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false);
                            navigate("/app/gestao?tab=limites");
                          }}
                          className="w-full"
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Ir para Gestão → Limites Modalidade
                        </Button>
                      )}
                    </div>
                  ) : bloqueio3_empenho ? (
                    /* 3º Bloqueio: Empenho insuficiente */
                    <div className="space-y-3">
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Autorização Bloqueada — Empenho Insuficiente
                        </p>
                        <p className="text-xs text-foreground mt-1">
                          O valor empenhado ({totalEmpenhado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) é inferior ao orçamento desta OS ({valorOS.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).
                          {creditoNaoEmpenhado > 0 
                            ? ` Há crédito não empenhado de ${creditoNaoEmpenhado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} disponível. Solicite o reforço do empenho junto à área financeira antes de autorizar.`
                            : " Solicite crédito suplementar e o respectivo empenho para prosseguir."
                          }
                        </p>
                      </div>
                      {isGestorOrFiscal && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false);
                            navigate("/app/orcamento?tab=dotacoes");
                          }}
                          className="w-full"
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Ir para Gestão Orçamentária — Registrar Empenho
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Sem bloqueios — pode autorizar */
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Prazo para Conclusão da Execução *
                        </Label>
                        <Input
                          type="date"
                          value={prazoExecucao}
                          onChange={(e) => setPrazoExecucao(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Obrigatório. Defina o prazo limite para que a execução do serviço seja concluída.</p>
                      </div>
                      <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Autorizar Execução
                      </Button>
                    </div>
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
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> Relatório de Execução do Serviço *
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx"
                    onChange={(e) => setRelatorioExecucao(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Anexe o relatório de execução do serviço (obrigatório para avançar).
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Certifique-se de que as fotos e evidências da execução foram carregadas antes de submeter.
                </p>
                <Button onClick={handleAdvanceStatus} disabled={uploading || (!relatorioExecucao && !(os as any).relatorio_execucao_preposto)} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submeter para Ateste
                </Button>
              </div>
            </>
          )}

          {/* SOLICITAÇÃO DE PRAZO ADICIONAL — preposto/terceirizado pode solicitar, gestor/fiscal aprova */}
          {os.status === "execucao" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Solicitações de Prazo Adicional
                </h4>

                {/* List existing requests */}
                {(solicitacoesPrazo.data || []).map((sol) => (
                  <div
                    key={sol.id}
                    className={`rounded-md border p-3 space-y-2 ${
                      sol.status === "pendente"
                        ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800"
                        : sol.status === "aprovada"
                        ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                        : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {sol.solicitante_nome || "Preposto"}
                      </span>
                      <Badge
                        variant={
                          sol.status === "pendente"
                            ? "secondary"
                            : sol.status === "aprovada"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {sol.status === "pendente" ? "Pendente" : sol.status === "aprovada" ? "Aprovada" : "Rejeitada"}
                      </Badge>
                    </div>
                    <p className="text-sm">{sol.justificativa}</p>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>Prazo solicitado: {new Date(sol.prazo_solicitado + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                      <span>Em: {new Date(sol.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>

                    {/* Response */}
                    {sol.resposta && (
                      <div className="text-sm border-t pt-2 mt-1">
                        <span className="text-muted-foreground">Resposta: </span>
                        {sol.resposta}
                        {sol.prazo_aprovado && (
                          <span className="ml-2 font-medium">
                            — Novo prazo: {new Date(sol.prazo_aprovado + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Approve/Reject inline — gestor/fiscal */}
                    {sol.status === "pendente" && isGestorOrFiscal && (
                      <>
                        {respondingId === sol.id ? (
                          <div className="space-y-2 border-t pt-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Novo prazo (se aprovando)</Label>
                              <Input
                                type="date"
                                value={prazoAprovado}
                                onChange={(e) => setPrazoAprovado(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Resposta *</Label>
                              <Textarea
                                value={respostaPrazo}
                                onChange={(e) => setRespostaPrazo(e.target.value)}
                                placeholder="Justifique a aprovação ou rejeição..."
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRespondingId(null);
                                  setRespostaPrazo("");
                                  setPrazoAprovado("");
                                }}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!respostaPrazo.trim() || respondSolicitacaoPrazo.isPending}
                                className="flex-1"
                                onClick={async () => {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  await respondSolicitacaoPrazo.mutateAsync({
                                    id: sol.id,
                                    os_id: os.id,
                                    status: "rejeitada",
                                    resposta: respostaPrazo.trim(),
                                    respondido_por: user?.id || "",
                                  });
                                  toast.success("Solicitação de prazo rejeitada");
                                  setRespondingId(null);
                                  setRespostaPrazo("");
                                }}
                              >
                                Rejeitar
                              </Button>
                              <Button
                                size="sm"
                                disabled={!respostaPrazo.trim() || !prazoAprovado || respondSolicitacaoPrazo.isPending}
                                className="flex-1"
                                onClick={async () => {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  await respondSolicitacaoPrazo.mutateAsync({
                                    id: sol.id,
                                    os_id: os.id,
                                    status: "aprovada",
                                    resposta: respostaPrazo.trim(),
                                    prazo_aprovado: prazoAprovado,
                                    respondido_por: user?.id || "",
                                  });
                                  toast.success("Prazo adicional aprovado! Prazo de execução atualizado.");
                                  setRespondingId(null);
                                  setRespostaPrazo("");
                                  setPrazoAprovado("");
                                }}
                              >
                                {respondSolicitacaoPrazo.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                Aprovar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRespondingId(sol.id);
                              setPrazoAprovado(sol.prazo_solicitado);
                            }}
                            className="w-full"
                          >
                            Responder Solicitação
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {/* Preposto/terceirizado can request deadline extension */}
                {(isPreposto || isTerceirizado) && (
                  <>
                    {!showSolicitarPrazo ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowSolicitarPrazo(true)}
                        className="w-full"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Solicitar Prazo Adicional
                      </Button>
                    ) : (
                      <div className="space-y-2 border rounded-md p-3">
                        <div className="space-y-1.5">
                          <Label>Novo prazo solicitado *</Label>
                          <Input
                            type="date"
                            value={prazoSolicitado}
                            onChange={(e) => setPrazoSolicitado(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Justificativa *</Label>
                          <Textarea
                            value={justificativaPrazo}
                            onChange={(e) => setJustificativaPrazo(e.target.value)}
                            placeholder="Explique o motivo da necessidade de mais prazo..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowSolicitarPrazo(false);
                              setPrazoSolicitado("");
                              setJustificativaPrazo("");
                            }}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button
                            disabled={!prazoSolicitado || !justificativaPrazo.trim() || createSolicitacaoPrazo.isPending}
                            className="flex-1"
                            onClick={async () => {
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                await createSolicitacaoPrazo.mutateAsync({
                                  os_id: os.id,
                                  solicitante_id: user?.id || "",
                                  prazo_solicitado: prazoSolicitado,
                                  justificativa: justificativaPrazo.trim(),
                                });
                                toast.success("Solicitação de prazo adicional enviada!");
                                setShowSolicitarPrazo(false);
                                setPrazoSolicitado("");
                                setJustificativaPrazo("");
                              } catch (err: any) {
                                toast.error("Erro: " + err.message);
                              }
                            }}
                          >
                            {createSolicitacaoPrazo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Solicitação
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(solicitacoesPrazo.data || []).length === 0 && !isPreposto && !isTerceirizado && (
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação de prazo adicional registrada.</p>
                )}
              </div>
            </>
          )}

          {/* ATESTE → FATURAMENTO: gestor/fiscal/operador approves ateste (standard flow) */}
          {canAdvance && nextStatus === "faturamento" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Ateste do Serviço
                </h4>
                <p className="text-sm text-muted-foreground">
                  Aprove a execução do serviço e autorize a emissão da nota fiscal e juntada das certidões.
                </p>
                <Button onClick={handleAdvanceStatus} disabled={uploading} className="w-full">
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Aprovar e Autorizar Emissão da Nota Fiscal
                </Button>
              </div>
            </>
          )}

          {/* ATESTE → ENCERRADA: cartao_corporativo (skips faturamento/pagamento) */}
          {canAdvance && nextStatus === "encerrada" && os.status === "ateste" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Ateste e Encerramento (Cartão Corporativo)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Como esta OS está vinculada a um contrato de Cartão Corporativo, ao aprovar o ateste a OS será encerrada diretamente (sem faturamento/pagamento).
                </p>
                <Button
                  onClick={async () => {
                    setUploading(true);
                    try {
                      await updateOS.mutateAsync({
                        id: os.id,
                        status: "encerrada" as any,
                        data_encerramento: new Date().toISOString(),
                      });
                      toast.success("OS encerrada com sucesso!");
                      const emailOk = await sendTransitionNotification("ateste", "encerrada");
                      if (!emailOk) toast.warning("A notificação por e-mail pode não ter sido enviada.", { duration: 8000 });
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
                  Aprovar Ateste e Encerrar OS
                </Button>
              </div>
            </>
          )}

          {/* FATURAMENTO → PAGAMENTO: preposto/terceirizado uploads NF and certidões */}
          {canAdvance && nextStatus === "pagamento" && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Faturamento — Nota Fiscal e Certidões
                </h4>
                <p className="text-sm text-muted-foreground">
                  Carregue a nota fiscal emitida e as certidões exigidas para prosseguir com o pagamento.
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
                    if (!documentosPagamento || documentosPagamento.length === 0) {
                      toast.error("Carregue a nota fiscal e certidões antes de avançar");
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
                        status: "pagamento" as any,
                        documentos_pagamento: [...existing, ...urls],
                        motivo_restituicao: null,
                      } as any);
                      toast.success("Documentos enviados! OS encaminhada para pagamento.");
                      const emailOk3 = await sendTransitionNotification("faturamento", "pagamento");
                      if (!emailOk3) toast.warning("A notificação por e-mail pode não ter sido enviada.", { duration: 8000 });
                      setDocumentosPagamento(null);
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
                  Enviar NF/Certidões e Encaminhar para Pagamento
                </Button>
              </div>
            </>
          )}

          {/* PAGAMENTO: gestor/fiscal reviews and can proceed to close */}

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

                      // Fetch linked chamados for report
                      const { data: chamadosForReport } = await supabase
                        .from("chamados")
                        .select("codigo, tipo_demanda, local_servico, descricao, gut_gravidade, gut_urgencia, gut_tendencia, gut_score, prioridade, created_at, status, solicitante_id")
                        .eq("os_id", os.id);

                      // Resolve chamado solicitante names
                      const chamadoSolIds = [...new Set((chamadosForReport || []).map((c: any) => c.solicitante_id).filter(Boolean))];
                      let chamadoSolMap: Record<string, string> = {};
                      if (chamadoSolIds.length > 0) {
                        const { data: chamadoProfiles } = await supabase
                          .from("profiles")
                          .select("user_id, full_name")
                          .in("user_id", chamadoSolIds);
                        if (chamadoProfiles) {
                          chamadoSolMap = Object.fromEntries(chamadoProfiles.map(p => [p.user_id, p.full_name]));
                        }
                      }

                      const chamadosData = (chamadosForReport || []).map((ch: any) => ({
                        codigo: ch.codigo,
                        tipo_demanda: ch.tipo_demanda,
                        local_servico: ch.local_servico,
                        descricao: ch.descricao,
                        gut_gravidade: ch.gut_gravidade,
                        gut_urgencia: ch.gut_urgencia,
                        gut_tendencia: ch.gut_tendencia,
                        gut_score: ch.gut_score,
                        prioridade: ch.prioridade,
                        created_at: ch.created_at,
                        status: ch.status,
                        solicitante_nome: chamadoSolMap[ch.solicitante_id] || "—",
                      }));

                      // Fetch contrato saldo for conformidade section
                      let contratoSaldo = null;
                      if (os.contrato_id) {
                        const { data: saldoData } = await supabase
                          .from("contratos_saldo")
                          .select("*")
                          .eq("id", os.contrato_id)
                          .single();
                        if (saldoData) {
                          contratoSaldo = {
                            valorTotal: Number(saldoData.valor_total) || 0,
                            totalAditivos: Number(saldoData.total_aditivos) || 0,
                            totalCustos: Number(saldoData.total_custos) || 0,
                            saldo: Number(saldoData.saldo) || 0,
                          };
                        }
                      }

                      // Build audit transitions for extended responsibility matrix
                      const auditoriaTransicoes = (auditLogs || []).map(log => ({
                        etapa: log.description || log.action,
                        acao: log.action === "restituicao" ? "Restituição" : "Transição de Status",
                        usuario: log.user_id ? (auditProfileMap[log.user_id] || "Não identificado") : "Sistema",
                        data: new Date(log.created_at).toLocaleString("pt-BR"),
                      }));

                      const custosArr = custos.data?.map(c => ({ descricao: c.descricao, tipo: c.tipo, valor: Number(c.valor) })) || [];
                      const totalCustosVal = custosArr.reduce((sum, c) => sum + c.valor, 0);

                      // Fiscal name
                      const fiscalNome = os.responsavel_id ? getName(os.responsavel_id) : undefined;

                      // Generate PDF report
                      generateOSReport({
                        os,
                        contrato,
                        custos: custosArr,
                        responsaveis,
                        valorAtestado,
                        geradoPor: geradoPorNome,
                        historicoFluxo,
                        chamados: chamadosData,
                        totalCustos: totalCustosVal,
                        contratoSaldo,
                        fiscalNome,
                        auditoriaTransicoes,
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

          {/* AGENDAMENTOS */}
          <Separator />
          <OSAgendamentosTab osId={os.id} osCodigo={os.codigo} osStatus={os.status} />

          {/* HISTÓRICO DO FLUXO (TIMELINE IMR) */}
          <Separator />
          <OSHistoricoTimeline osId={os.id} osCodigo={os.codigo} dataAbertura={os.data_abertura} />

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
