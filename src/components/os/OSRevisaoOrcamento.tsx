import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, AlertTriangle, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { useRevisoesOrcamento, useCreateRevisao, useApproveRevisao, useRejectRevisao } from "@/hooks/useRevisoesOrcamento";
import { useSaldoOrcamentarioRegional } from "@/hooks/useSaldoOrcamentario";
import { useContratosSaldo } from "@/hooks/useContratos";
import type { OrdemServico } from "@/hooks/useOrdensServico";

interface Props {
  os: OrdemServico;
  isGestorOrFiscal: boolean;
  isPreposto: boolean;
  isTerceirizado: boolean;
}

export function OSRevisaoOrcamento({ os, isGestorOrFiscal, isPreposto, isTerceirizado }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [novoValor, setNovoValor] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respostaAprovacao, setRespostaAprovacao] = useState("");

  const revisoes = useRevisoesOrcamento(os.id);
  const createRevisao = useCreateRevisao();
  const approveRevisao = useApproveRevisao();
  const rejectRevisao = useRejectRevisao();

  const osRegionalId = (os as any)?.regional_id;
  const { data: saldoOrcamento } = useSaldoOrcamentarioRegional(osRegionalId);
  const { data: saldos = [] } = useContratosSaldo();

  const valorAtual = Number(os.valor_orcamento) || 0;
  const canRequest = isPreposto || isTerceirizado || isGestorOrFiscal;

  const handleSubmitRevisao = async () => {
    const valor = parseFloat(novoValor);
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (valor === valorAtual) {
      toast.error("O novo valor deve ser diferente do atual");
      return;
    }
    if (!justificativa.trim()) {
      toast.error("Informe a justificativa");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createRevisao.mutateAsync({
        os_id: os.id,
        valor_anterior: valorAtual,
        valor_novo: valor,
        justificativa: justificativa.trim(),
        solicitado_por: user?.id || "",
      });
      toast.success("Revisão orçamentária solicitada!");
      setShowForm(false);
      setNovoValor("");
      setJustificativa("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleApprove = async (revisaoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await approveRevisao.mutateAsync({
        revisaoId,
        aprovadoPor: user?.id || "",
        resposta: respostaAprovacao.trim() || undefined,
      });
      toast.success("Revisão aprovada! Valor da OS atualizado.");
      setRespondingId(null);
      setRespostaAprovacao("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleReject = async (revisaoId: string) => {
    if (!respostaAprovacao.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await rejectRevisao.mutateAsync({
        revisaoId,
        aprovadoPor: user?.id || "",
        resposta: respostaAprovacao.trim(),
      });
      toast.success("Revisão recusada.");
      setRespondingId(null);
      setRespostaAprovacao("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const novoValorNum = parseFloat(novoValor) || 0;
  const delta = novoValorNum - valorAtual;
  const isAumento = delta > 0;

  const saldoEmpenhado = saldoOrcamento?.saldo_empenhado ?? 0;
  const saldoParaDelta = saldoEmpenhado;
  const empenhoInsuficiente = isAumento && novoValorNum > saldoParaDelta;

  const saldoContratoInfo = saldos.find((s: any) => s.id === os.contrato_id);
  const saldoContrato = saldoContratoInfo ? Number((saldoContratoInfo as any).saldo) : null;
  const contratoInsuficiente = isAumento && saldoContrato !== null && (saldoContrato + valorAtual) < novoValorNum;

  const hasPendente = (revisoes.data || []).some(r => r.status === "pendente");

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-1">
        <DollarSign className="h-4 w-4" /> Revisão Orçamentária
      </h4>

      <div className="text-sm p-3 bg-muted rounded-md">
        <span className="text-muted-foreground">Valor atual:</span>{" "}
        <span className="font-medium">
          {valorAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>

      {(revisoes.data || []).map((rev) => (
        <div
          key={rev.id}
          className={`rounded-md border p-3 space-y-2 ${
            rev.status === "pendente"
              ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800"
              : rev.status === "aprovado"
              ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {rev.diferenca > 0 ? (
                <TrendingUp className="h-4 w-4 text-orange-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm font-medium">
                {rev.valor_anterior.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                {" → "}
                {rev.valor_novo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span className={`text-xs font-medium ${rev.diferenca > 0 ? "text-orange-600" : "text-green-600"}`}>
                ({rev.diferenca > 0 ? "+" : ""}
                {rev.diferenca.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
              </span>
            </div>
            <Badge
              variant={
                rev.status === "pendente" ? "secondary" :
                rev.status === "aprovado" ? "default" : "destructive"
              }
            >
              {rev.status === "pendente" ? "Pendente" : rev.status === "aprovado" ? "Aprovada" : "Recusada"}
            </Badge>
          </div>

          <p className="text-sm">{rev.justificativa}</p>
          <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
            <span>Por: {rev.solicitante_nome || "—"}</span>
            <span>Em: {new Date(rev.created_at).toLocaleDateString("pt-BR")}</span>
          </div>

          {rev.resposta && (
            <div className="text-sm border-t pt-2 mt-1">
              <span className="text-muted-foreground">Resposta ({rev.aprovador_nome || "—"}): </span>
              {rev.resposta}
            </div>
          )}

          {rev.status === "pendente" && isGestorOrFiscal && (
            <>
              {respondingId === rev.id ? (
                <div className="space-y-2 border-t pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observação (obrigatória para recusar)</Label>
                    <Textarea
                      value={respostaAprovacao}
                      onChange={(e) => setRespostaAprovacao(e.target.value)}
                      placeholder="Justifique a decisão..."
                      rows={2}
                    />
                  </div>

                  {rev.diferenca > 0 && saldoOrcamento && (
                    <div className={`text-xs p-2 rounded border ${
                      rev.valor_novo > (saldoOrcamento.saldo_empenhado ?? 0)
                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                        : "bg-muted"
                    }`}>
                      <span className="font-medium">Validação de saldo: </span>
                      Saldo empenhado disponível: {(saldoOrcamento.saldo_empenhado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {" | "}Novo valor: {rev.valor_novo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {rev.valor_novo > (saldoOrcamento.saldo_empenhado ?? 0) && (
                        <p className="mt-1 font-medium">⚠ Empenho insuficiente — a aprovação será bloqueada pelo banco de dados.</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRespondingId(null); setRespostaAprovacao(""); }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!respostaAprovacao.trim() || rejectRevisao.isPending}
                      className="flex-1"
                      onClick={() => handleReject(rev.id)}
                    >
                      {rejectRevisao.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Recusar
                    </Button>
                    <Button
                      size="sm"
                      disabled={approveRevisao.isPending}
                      className="flex-1"
                      onClick={() => handleApprove(rev.id)}
                    >
                      {approveRevisao.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Aprovar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRespondingId(rev.id)}
                  className="w-full"
                >
                  Analisar Revisão
                </Button>
              )}
            </>
          )}
        </div>
      ))}

      {canRequest && !hasPendente && (
        <>
          {!showForm ? (
            <Button
              variant="outline"
              onClick={() => { setShowForm(true); setNovoValor(""); }}
              className="w-full"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Solicitar Revisão de Orçamento
            </Button>
          ) : (
            <div className="space-y-3 border rounded-md p-3">
              <div className="space-y-1.5">
                <Label>Novo valor orçado (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                />
              </div>

              {novoValorNum > 0 && novoValorNum !== valorAtual && (
                <div className={`text-sm p-2 rounded-md border ${
                  isAumento ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30" : "border-green-300 bg-green-50 dark:bg-green-950/30"
                }`}>
                  <div className="flex items-center gap-2">
                    {isAumento ? <TrendingUp className="h-4 w-4 text-orange-600" /> : <TrendingDown className="h-4 w-4 text-green-600" />}
                    <span className="font-medium">
                      {isAumento ? "Acréscimo" : "Redução"}: {Math.abs(delta).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>

                  {isAumento && saldoOrcamento && (
                    <div className="mt-2 text-xs space-y-1">
                      <p>
                        Saldo empenhado disponível: {saldoParaDelta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        {empenhoInsuficiente && (
                          <span className="text-destructive font-medium ml-1">⚠ Insuficiente</span>
                        )}
                      </p>
                    </div>
                  )}

                  {isAumento && empenhoInsuficiente && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      A revisão poderá ser solicitada, mas a aprovação será bloqueada por insuficiência de empenho.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Justificativa *</Label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Descreva o motivo da alteração do valor orçado..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowForm(false); setNovoValor(""); setJustificativa(""); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={!novoValor || !justificativa.trim() || createRevisao.isPending || novoValorNum === valorAtual}
                  className="flex-1"
                  onClick={handleSubmitRevisao}
                >
                  {createRevisao.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Solicitar Revisão
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {hasPendente && canRequest && !isGestorOrFiscal && (
        <p className="text-xs text-muted-foreground">Já existe uma revisão pendente de aprovação.</p>
      )}

      {(revisoes.data || []).length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Nenhuma revisão orçamentária registrada.</p>
      )}
    </div>
  );
}
