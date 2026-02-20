import { useState } from "react";
import { useSolicitacoesCredito, useRespondSolicitacaoCredito, useCreateSolicitacaoCredito } from "@/hooks/useSaldoOrcamentario";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "default" },
  aprovada: { label: "Aprovada", variant: "secondary" },
  recusada: { label: "Recusada", variant: "destructive" },
};

export default function GestaoSolicitacoesCredito() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const { data: solicitacoes = [], isLoading } = useSolicitacoesCredito();
  const respond = useRespondSolicitacaoCredito();
  const createSolicitacao = useCreateSolicitacaoCredito();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [showNovaDialog, setShowNovaDialog] = useState(false);

  const isNacional = role === "gestor_nacional";
  const isRegional = role === "gestor_regional";

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
    try {
      await respond.mutateAsync({
        id,
        status,
        resposta: resposta.trim(),
        respondido_por: user?.id || "",
      });
      toast.success(status === "aprovada" ? "Solicitação aprovada!" : "Solicitação recusada.");
      setRespondingId(null);
      setResposta("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Solicitações de crédito suplementar enviadas por Gestores Regionais e Fiscais.
        </p>
        {isRegional && (
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

              {sol.status === "pendente" && isNacional && (
                respondingId === sol.id ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Resposta</Label>
                    <Textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Informe a decisão e orientações..."
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setRespondingId(null); setResposta(""); }}>Cancelar</Button>
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
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setRespondingId(sol.id)}>Responder</Button>
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
