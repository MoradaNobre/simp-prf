import { useState, useMemo } from "react";
import { useSolicitacoesCredito, useRespondSolicitacaoCredito, useCreateSolicitacaoCredito, useDeleteSolicitacaoCredito } from "@/hooks/useSaldoOrcamentario";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Plus, Landmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "default" },
  aprovada: { label: "Aprovada", variant: "secondary" },
  recusada: { label: "Recusada", variant: "destructive" },
};

export default function GestaoSolicitacoesCredito({ filtroRegional }: { filtroRegional?: string }) {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const { data: allSolicitacoes = [], isLoading } = useSolicitacoesCredito();
  const solicitacoes = filtroRegional ? allSolicitacoes.filter(s => s.regional_id === filtroRegional) : allSolicitacoes;
  const respond = useRespondSolicitacaoCredito();
  const createSolicitacao = useCreateSolicitacaoCredito();
  const deleteSolicitacao = useDeleteSolicitacaoCredito();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [valorAprovado, setValorAprovado] = useState("");
  const [showNovaDialog, setShowNovaDialog] = useState(false);

  const isNacional = role === "gestor_nacional";
  const isRegional = role === "gestor_regional";
  const isFiscal = role === "fiscal_contrato";
  const canSolicitar = isRegional || isFiscal;

  const currentYear = new Date().getFullYear();

  // Fetch Portaria Orçamentária for current year (nacional only)
  const { data: loa } = useQuery({
    queryKey: ["orcamento-loa", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_loa" as any)
        .select("*")
        .eq("exercicio", currentYear)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: isNacional,
  });

  // Fetch cotas to compute total distributed
  const { data: dotacoes = [] } = useQuery({
    queryKey: ["orcamento-anual", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_anual" as any)
        .select("id, valor_dotacao, regional_id")
        .eq("exercicio", currentYear);
      if (error) throw error;
      return data as any[];
    },
    enabled: isNacional,
  });

  const { data: creditosLoa = [] } = useQuery({
    queryKey: ["orcamento-creditos", currentYear],
    queryFn: async () => {
      const orcIds = dotacoes.map((o: any) => o.id);
      if (orcIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orcamento_creditos" as any)
        .select("*")
        .in("orcamento_id", orcIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: isNacional && dotacoes.length > 0,
  });

  const loaResumo = useMemo(() => {
    if (!isNacional) return null;
    const valorLOA = loa ? Number(loa.valor_total) : 0;
    const totalDistribuido = dotacoes.reduce((s: number, orc: any) => {
      const creds = creditosLoa.filter((c: any) => c.orcamento_id === orc.id);
      const totalCreds = creds.reduce((sc: number, c: any) => {
        const v = Number(c.valor);
        return c.tipo === "reducao" ? sc - v : sc + v;
      }, 0);
      return s + Number(orc.valor_dotacao) + totalCreds;
    }, 0);
    const saldoNaoDistribuido = valorLOA - totalDistribuido;
    return { valorLOA, totalDistribuido, saldoNaoDistribuido };
  }, [isNacional, loa, dotacoes, creditosLoa]);

  // Fetch regional names
  const { data: regionais = [] } = useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data } = await supabase.from("regionais").select("id, sigla, nome");
      return data || [];
    },
  });

  // Fetch OS codes
  const osIds = [...new Set(solicitacoes.map(s => s.os_id).filter(Boolean))];
  const { data: osList = [] } = useQuery({
    queryKey: ["os-codigos", osIds],
    queryFn: async () => {
      if (osIds.length === 0) return [];
      const { data } = await supabase.from("ordens_servico").select("id, codigo, titulo").in("id", osIds);
      return data || [];
    },
    enabled: osIds.length > 0,
  });

  // Fetch solicitante names
  const solicitanteIds = [...new Set(solicitacoes.map(s => s.solicitante_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-sol", solicitanteIds],
    queryFn: async () => {
      if (solicitanteIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", solicitanteIds);
      return data || [];
    },
    enabled: solicitanteIds.length > 0,
  });

  const getRegional = (id: string) => regionais.find(r => r.id === id);
  const getOS = (id: string) => osList.find(o => o.id === id);
  const getProfile = (id: string) => profiles.find(p => p.user_id === id);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleRespond = async (id: string, status: "aprovada" | "recusada") => {
    if (!resposta.trim()) {
      toast.error("Informe uma resposta");
      return;
    }
    const vAprovado = status === "aprovada" && valorAprovado ? Number(valorAprovado) : undefined;
    try {
      await respond.mutateAsync({
        id,
        status,
        resposta: resposta.trim(),
        respondido_por: user?.id || "",
        valor_aprovado: vAprovado,
      });
      const msg = status === "recusada"
        ? "Solicitação recusada."
        : vAprovado !== undefined
          ? "Solicitação aprovada com valor definido!"
          : "Solicitação aprovada!";
      toast.success(msg);
      setRespondingId(null);
      setResposta("");
      setValorAprovado("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSolicitacao.mutateAsync(id);
      toast.success("Solicitação excluída.");
      setDeletingId(null);
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  };

  const startResponding = (sol: any) => {
    setRespondingId(sol.id);
    setDeletingId(null);
    setResposta("");
    // Pre-fill valor_aprovado with the requested amount
    setValorAprovado(sol.valor_solicitado > 0 ? String(sol.valor_solicitado) : sol.valor_os > 0 ? String(sol.valor_os) : "");
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Solicitações de crédito suplementar enviadas por Gestores Regionais e Fiscais.
        </p>
        {canSolicitar && (
          <Button size="sm" onClick={() => setShowNovaDialog(true)}>
            <Plus className="mr-1 h-3 w-3" /> Solicitar Crédito
          </Button>
        )}
      </div>

      {solicitacoes.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma solicitação de crédito suplementar registrada.</p>
      ) : (
        solicitacoes.map((sol) => {
          const regional = getRegional(sol.regional_id);
          const os = sol.os_id ? getOS(sol.os_id) : null;
          const profileData = getProfile(sol.solicitante_id);
          const st = statusBadge[sol.status] || statusBadge.pendente;

          return (
            <div key={sol.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">
                      {os ? `${os.codigo} — ${os.titulo}` : sol.os_id ? sol.os_id : "Solicitação Avulsa"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Regional: {regional ? `${regional.sigla} — ${regional.nome}` : sol.regional_id}
                    {" · "}Solicitante: {profileData?.full_name || "—"}
                    {" · "}{new Date(sol.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {sol.valor_solicitado > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Valor Solicitado</span>
                    <p className="font-medium">{fmt(sol.valor_solicitado)}</p>
                  </div>
                )}
                {sol.os_id && (
                  <div>
                    <span className="text-muted-foreground text-xs">Valor da OS</span>
                    <p className="font-medium">{fmt(sol.valor_os)}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground text-xs">Saldo Contrato</span>
                  <p className={`font-medium ${sol.os_id && sol.saldo_contrato < sol.valor_os ? "text-destructive" : ""}`}>
                    {fmt(sol.saldo_contrato)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Saldo Orçamento</span>
                  <p className={`font-medium ${sol.os_id && sol.saldo_orcamento < sol.valor_os ? "text-destructive" : ""}`}>
                    {fmt(sol.saldo_orcamento)}
                  </p>
                </div>
              </div>

              {/* Show approved amount if different from requested */}
              {sol.status === "aprovada" && sol.valor_aprovado != null && sol.valor_aprovado > 0 && (
                <div className="rounded-md bg-secondary/50 p-2">
                  <span className="text-xs text-muted-foreground">Valor Aprovado:</span>
                  <p className="text-sm font-semibold mt-0.5">
                    {fmt(sol.valor_aprovado)}
                    {sol.valor_solicitado > 0 && sol.valor_aprovado < sol.valor_solicitado && (
                      <span className="text-xs text-muted-foreground ml-2">(aprovação parcial)</span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs text-muted-foreground">Justificativa:</span>
                <p className="text-sm mt-0.5">{sol.motivo}</p>
              </div>

              {sol.resposta && (
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Resposta do Gestor Nacional:</span>
                  <p className="text-sm mt-0.5">{sol.resposta}</p>
                </div>
              )}

              {isNacional && (
                respondingId === sol.id ? (
                  <div className="space-y-3">
                     {/* Portaria Orçamentária balance info */}
                     {loaResumo && (
                       <div className="rounded-md border border-border bg-muted/50 p-3 flex items-center gap-3 flex-wrap text-xs">
                         <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                         <div className="flex gap-4 flex-wrap">
                           <span>Portaria {currentYear}: <strong>{fmt(loaResumo.valorLOA)}</strong></span>
                           <span>Distribuído: <strong>{fmt(loaResumo.totalDistribuido)}</strong></span>
                           <span className={loaResumo.saldoNaoDistribuido < 0 ? "text-destructive font-semibold" : ""}>
                             Saldo Portaria: <strong>{fmt(loaResumo.saldoNaoDistribuido)}</strong>
                           </span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Valor a Aprovar (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={valorAprovado}
                        onChange={(e) => setValorAprovado(e.target.value)}
                        placeholder="Deixe vazio para aprovar o valor total solicitado"
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Altere para aprovar parcialmente com valor diferente do solicitado.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Resposta / Justificativa</Label>
                      <Textarea
                        value={resposta}
                        onChange={(e) => setResposta(e.target.value)}
                        placeholder="Informe a decisão e orientações..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => { setRespondingId(null); setResposta(""); setValorAprovado(""); }}>Cancelar</Button>
                      <Button size="sm" onClick={() => handleRespond(sol.id, "aprovada")} disabled={respond.isPending}>
                        {respond.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                        Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRespond(sol.id, "recusada")} disabled={respond.isPending}>
                        {respond.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <XCircle className="mr-1 h-3 w-3" />}
                        Recusar
                      </Button>
                    </div>
                  </div>
                ) : deletingId === sol.id ? (
                  <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">Confirmar exclusão desta solicitação?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(sol.id)} disabled={deleteSolicitacao.isPending}>
                        {deleteSolicitacao.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                        Confirmar Exclusão
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {sol.status === "pendente" && (
                      <Button size="sm" variant="outline" onClick={() => startResponding(sol)}>Responder</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeletingId(sol.id); setRespondingId(null); }}>
                      <Trash2 className="mr-1 h-3 w-3" /> Excluir
                    </Button>
                  </div>
                )
              )}
            </div>
          );
        })
      )}

      {/* Dialog for standalone credit request */}
      <NovaSolicitacaoDialog
        open={showNovaDialog}
        onClose={() => setShowNovaDialog(false)}
        regionais={(profile as any)?.regionais || []}
        userId={user?.id || ""}
        onSave={createSolicitacao}
      />
    </div>
  );
}

function NovaSolicitacaoDialog({ open, onClose, regionais, userId, onSave }: {
  open: boolean;
  onClose: () => void;
  regionais: { id: string; sigla: string; nome: string }[];
  userId: string;
  onSave: any;
}) {
  const [regionalId, setRegionalId] = useState("");
  const [valorSolicitado, setValorSolicitado] = useState("");
  const [motivo, setMotivo] = useState("");

  // Auto-select if single regional
  const effectiveRegionalId = regionais.length === 1 ? regionais[0].id : regionalId;

  const handleSubmit = async () => {
    if (!effectiveRegionalId || !motivo.trim() || !valorSolicitado) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    try {
      await onSave.mutateAsync({
        regional_id: effectiveRegionalId,
        os_id: null,
        solicitante_id: userId,
        valor_os: 0,
        saldo_contrato: 0,
        saldo_orcamento: 0,
        valor_solicitado: Number(valorSolicitado),
        motivo: motivo.trim(),
      });
      toast.success("Solicitação de crédito enviada!");
      onClose();
      setRegionalId("");
      setValorSolicitado("");
      setMotivo("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Crédito Suplementar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Regional</Label>
            {regionais.length === 1 ? (
              <p className="text-sm font-medium">{regionais[0].sigla} — {regionais[0].nome}</p>
            ) : (
              <select className="w-full border rounded-md p-2 text-sm" value={regionalId} onChange={(e) => setRegionalId(e.target.value)}>
                <option value="">Selecione...</option>
                {regionais.map(r => <option key={r.id} value={r.id}>{r.sigla} — {r.nome}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Valor Solicitado (R$)</Label>
            <Input type="number" step="0.01" value={valorSolicitado} onChange={(e) => setValorSolicitado(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Justificativa</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Descreva a necessidade do crédito suplementar..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={onSave.isPending || !motivo.trim() || !valorSolicitado} onClick={handleSubmit}>
            {onSave.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
