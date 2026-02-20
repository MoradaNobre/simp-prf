import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function GestaoLOA({ exercicio }: { exercicio: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  // Fetch LOA for current year
  const { data: loa, isLoading: loaLoading } = useQuery({
    queryKey: ["orcamento-loa", exercicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_loa" as any)
        .select("*")
        .eq("exercicio", exercicio)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Fetch all regional dotações for this year
  const { data: dotacoes = [] } = useQuery({
    queryKey: ["orcamento-anual", exercicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_anual" as any)
        .select("*, regional:regionais(id, nome, sigla)")
        .eq("exercicio", exercicio)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch credits for dotacoes
  const { data: creditos = [] } = useQuery({
    queryKey: ["orcamento-creditos", exercicio],
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
    enabled: dotacoes.length > 0,
  });

  const resumo = useMemo(() => {
    const valorLOA = loa ? Number(loa.valor_total) : 0;

    const regionaisData = dotacoes.map((orc: any) => {
      const creds = creditos.filter((c: any) => c.orcamento_id === orc.id);
      const totalCreditos = creds.reduce((s: number, c: any) => {
        const v = Number(c.valor);
        return c.tipo === "reducao" ? s - v : s + v;
      }, 0);
      const dotacaoTotal = Number(orc.valor_dotacao) + totalCreditos;
      return {
        id: orc.id,
        regional: orc.regional,
        valorBase: Number(orc.valor_dotacao),
        dotacaoTotal,
      };
    });

    const totalDistribuido = regionaisData.reduce((s, r) => s + r.dotacaoTotal, 0);
    const saldoNaoDistribuido = valorLOA - totalDistribuido;
    const percentualDistribuido = valorLOA > 0 ? (totalDistribuido / valorLOA) * 100 : 0;

    return { valorLOA, regionaisData, totalDistribuido, saldoNaoDistribuido, percentualDistribuido };
  }, [loa, dotacoes, creditos]);

  const saveLOA = useMutation({
    mutationFn: async (values: { valor_total: number; observacoes: string }) => {
      if (loa) {
        const { error } = await supabase
          .from("orcamento_loa" as any)
          .update({ valor_total: values.valor_total, observacoes: values.observacoes })
          .eq("id", loa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("orcamento_loa" as any)
          .insert({ exercicio, valor_total: values.valor_total, observacoes: values.observacoes, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Orçamento LOA salvo!");
      queryClient.invalidateQueries({ queryKey: ["orcamento-loa"] });
      setShowDialog(false);
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  if (loaLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Valor total previsto na LOA para manutenção predial e controle de distribuição às regionais.
        </p>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          {loa ? <Pencil className="mr-1 h-3 w-3" /> : <Plus className="mr-1 h-3 w-3" />}
          {loa ? "Editar LOA" : "Definir LOA"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Orçamento LOA {exercicio}</p>
            <p className="text-2xl font-bold">{formatCurrency(resumo.valorLOA)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Distribuído</p>
            <p className="text-2xl font-bold">{formatCurrency(resumo.totalDistribuido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Saldo Não Distribuído</p>
            <p className={`text-2xl font-bold ${resumo.saldoNaoDistribuido < 0 ? "text-destructive" : ""}`}>
              {formatCurrency(resumo.saldoNaoDistribuido)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution progress */}
      {resumo.valorLOA > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Distribuído</span>
            <span>{resumo.percentualDistribuido.toFixed(1)}%</span>
          </div>
          <Progress
            value={Math.min(resumo.percentualDistribuido, 100)}
            className={resumo.percentualDistribuido > 100 ? "[&>div]:bg-destructive" : ""}
          />
        </div>
      )}

      {/* Regional breakdown */}
      {resumo.regionaisData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição por Regional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resumo.regionaisData.map((r) => {
                const pct = resumo.valorLOA > 0 ? (r.dotacaoTotal / resumo.valorLOA) * 100 : 0;
                return (
                  <div key={r.id} className="flex items-center gap-4">
                    <div className="w-32 sm:w-48 shrink-0">
                      <p className="text-sm font-medium">{r.regional?.sigla}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.regional?.nome}</p>
                    </div>
                    <div className="flex-1">
                      <Progress value={Math.min(pct, 100)} className="h-2" />
                    </div>
                    <div className="w-32 text-right shrink-0">
                      <p className="text-sm font-medium">{formatCurrency(r.dotacaoTotal)}</p>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loa?.observacoes && (
        <p className="text-sm text-muted-foreground italic">{loa.observacoes}</p>
      )}

      {/* LOA Dialog */}
      <LOADialog
        open={showDialog}
        loa={loa}
        onClose={() => setShowDialog(false)}
        onSave={(v: any) => saveLOA.mutate(v)}
        saving={saveLOA.isPending}
      />
    </div>
  );
}

function LOADialog({ open, loa, onClose, onSave, saving }: {
  open: boolean;
  loa: any;
  onClose: () => void;
  onSave: (v: { valor_total: number; observacoes: string }) => void;
  saving: boolean;
}) {
  const [valor, setValor] = useState(loa ? String(loa.valor_total) : "");
  const [obs, setObs] = useState(loa?.observacoes || "");

  // Reset when dialog opens
  const handleOpen = (o: boolean) => {
    if (o) {
      setValor(loa ? String(loa.valor_total) : "");
      setObs(loa?.observacoes || "");
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{loa ? "Editar Orçamento LOA" : "Definir Orçamento LOA"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor Total LOA (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              placeholder="Informações adicionais sobre a LOA..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={saving || !valor}
            onClick={() => onSave({ valor_total: Number(valor), observacoes: obs })}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
