import { useState, useMemo, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Plus, Pencil, Trash2, TrendingUp, TrendingDown, CircleDot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const currentYear = new Date().getFullYear();
const yearRange = Array.from({ length: 10 }, (_, i) => currentYear - 7 + i);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const tipoLabels: Record<string, string> = { inicial: "Dotação Inicial", suplementacao: "Suplementação", reducao: "Redução" };
const tipoIcons: Record<string, typeof CircleDot> = { inicial: CircleDot, suplementacao: TrendingUp, reducao: TrendingDown };
const tipoBadge: Record<string, string> = { inicial: "default", suplementacao: "secondary", reducao: "destructive" };

export default function GestaoOrcamento() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [exercicio, setExercicio] = useState(currentYear);
  const [dotacaoDialog, setDotacaoDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [creditoDialog, setCreditoDialog] = useState<{ open: boolean; orcamentoId?: string }>({ open: false });
  const [empenhoDialog, setEmpenhoDialog] = useState<{ open: boolean; orcamentoId?: string }>({ open: false });

  const isNacional = role === "gestor_nacional";
  const isRegional = role === "gestor_regional";

  const { data: regionais } = useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionais").select("*").order("sigla");
      if (error) throw error;
      return data;
    },
  });

  const { data: orcamentos, isLoading: orcLoading } = useQuery({
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

  const { data: creditos } = useQuery({
    queryKey: ["orcamento-creditos", exercicio],
    queryFn: async () => {
      const orcIds = (orcamentos || []).map((o: any) => o.id);
      if (orcIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orcamento_creditos" as any)
        .select("*")
        .in("orcamento_id", orcIds)
        .order("data_credito");
      if (error) throw error;
      return data as any[];
    },
    enabled: (orcamentos?.length ?? 0) > 0,
  });

  const { data: empenhos } = useQuery({
    queryKey: ["orcamento-empenhos", exercicio],
    queryFn: async () => {
      const orcIds = (orcamentos || []).map((o: any) => o.id);
      if (orcIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orcamento_empenhos" as any)
        .select("*")
        .in("orcamento_id", orcIds)
        .order("data_empenho", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: (orcamentos?.length ?? 0) > 0,
  });

  const { data: custosOS } = useQuery({
    queryKey: ["os-custos-exercicio", exercicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos")
        .select("valor, os_id, ordens_servico!inner(regional_id, data_abertura)")
        .gte("ordens_servico.data_abertura", `${exercicio}-01-01`)
        .lte("ordens_servico.data_abertura", `${exercicio}-12-31`);
      if (error) throw error;
      return data as any[];
    },
  });

  const consolidado = useMemo(() => {
    if (!orcamentos) return [];
    return orcamentos.map((orc: any) => {
      const creds = (creditos || []).filter((c: any) => c.orcamento_id === orc.id);
      const totalCreditos = creds.reduce((s: number, c: any) => {
        const v = Number(c.valor);
        return c.tipo === "reducao" ? s - v : s + v;
      }, 0);
      // Dotação total = valor base + créditos (suplementações - reduções)
      const dotacaoTotal = Number(orc.valor_dotacao) + totalCreditos;

      const emps = (empenhos || []).filter((e: any) => e.orcamento_id === orc.id);
      const totalEmpenhos = emps.reduce((s: number, e: any) => s + Number(e.valor), 0);
      const custos = (custosOS || []).filter((c: any) => c.ordens_servico?.regional_id === orc.regional_id);
      const totalCustosOS = custos.reduce((s: number, c: any) => s + Number(c.valor), 0);
      const totalConsumido = totalEmpenhos + totalCustosOS;
      const saldo = dotacaoTotal - totalConsumido;
      const percentual = dotacaoTotal > 0 ? (totalConsumido / dotacaoTotal) * 100 : 0;
      return { ...orc, creditosList: creds, dotacaoTotal, totalEmpenhos, totalCustosOS, totalConsumido, saldo, percentual, empenhosList: emps };
    });
  }, [orcamentos, creditos, empenhos, custosOS]);

  // Mutations
  const saveDotacao = useMutation({
    mutationFn: async (values: { id?: string; regional_id: string; exercicio: number; valor_dotacao?: number; observacoes: string }) => {
      if (values.id) {
        const { error } = await supabase.from("orcamento_anual" as any).update({ valor_dotacao: values.valor_dotacao ?? 0, observacoes: values.observacoes }).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orcamento_anual" as any).insert({
          regional_id: values.regional_id,
          exercicio: values.exercicio,
          valor_dotacao: values.valor_dotacao ?? 0,
          observacoes: values.observacoes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Orçamento salvo");
      queryClient.invalidateQueries({ queryKey: ["orcamento-anual"] });
      setDotacaoDialog({ open: false });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const saveCredito = useMutation({
    mutationFn: async (values: { orcamento_id: string; tipo: string; descricao: string; valor: number; data_credito: string; numero_documento: string }) => {
      const { error } = await supabase.from("orcamento_creditos" as any).insert({ ...values, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Crédito registrado");
      queryClient.invalidateQueries({ queryKey: ["orcamento-creditos"] });
      setCreditoDialog({ open: false });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const deleteCredito = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamento_creditos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Crédito removido"); queryClient.invalidateQueries({ queryKey: ["orcamento-creditos"] }); },
  });

  const saveEmpenho = useMutation({
    mutationFn: async (values: { orcamento_id: string; descricao: string; valor: number; data_empenho: string; numero_empenho: string }) => {
      const { error } = await supabase.from("orcamento_empenhos" as any).insert({ ...values, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empenho registrado");
      queryClient.invalidateQueries({ queryKey: ["orcamento-empenhos"] });
      setEmpenhoDialog({ open: false });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const deleteEmpenho = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamento_empenhos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Empenho removido"); queryClient.invalidateQueries({ queryKey: ["orcamento-empenhos"] }); },
  });

  const deleteDotacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamento_anual" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Orçamento removido"); queryClient.invalidateQueries({ queryKey: ["orcamento-anual"] }); },
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isNacional && !isRegional) return <Navigate to="/dashboard" replace />;

  const regionaisSemDotacao = (regionais || []).filter(r => !orcamentos?.some((o: any) => o.regional_id === r.id));
  const allRegionais = regionais || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Gestão do Orçamento
          </h1>
          <p className="text-muted-foreground">Dotação orçamentária anual por regional</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(exercicio)} onValueChange={(v) => setExercicio(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearRange.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {isNacional && (
            <Button onClick={() => setDotacaoDialog({ open: true })}>
              <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
            </Button>
          )}
        </div>
      </div>

      {orcLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : consolidado.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum orçamento cadastrado para {exercicio}.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {consolidado.map((item: any) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.regional?.sigla} — {item.regional?.nome} <Badge variant="outline" className="ml-2">{exercicio}</Badge></CardTitle>
                  <div className="flex items-center gap-2">
                    {isNacional && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setDotacaoDialog({ open: true, item })}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm("Remover este orçamento e todos os créditos/empenhos?")) deleteDotacao.mutate(item.id); }}><Trash2 className="h-3 w-3" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div><p className="text-xs text-muted-foreground">Dotação Total</p><p className="text-lg font-semibold">{formatCurrency(item.dotacaoTotal)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Custos OS</p><p className="text-lg font-semibold">{formatCurrency(item.totalCustosOS)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Empenhos Manuais</p><p className="text-lg font-semibold">{formatCurrency(item.totalEmpenhos)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Total Consumido</p><p className="text-lg font-semibold">{formatCurrency(item.totalConsumido)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-lg font-semibold ${item.saldo < 0 ? "text-destructive" : "text-emerald-600"}`}>{formatCurrency(item.saldo)}</p></div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Consumido</span><span>{item.percentual.toFixed(1)}%</span></div>
                  <Progress value={Math.min(item.percentual, 100)} className={item.percentual > 100 ? "[&>div]:bg-destructive" : ""} />
                </div>

                {item.observacoes && <p className="text-sm text-muted-foreground italic">{item.observacoes}</p>}

                {/* Créditos Orçamentários */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Créditos Orçamentários</h4>
                    {isNacional && (
                      <Button size="sm" variant="outline" onClick={() => setCreditoDialog({ open: true, orcamentoId: item.id })}>
                        <Plus className="mr-1 h-3 w-3" /> Crédito
                      </Button>
                    )}
                  </div>
                  {item.creditosList.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Nº Documento</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          {isNacional && <TableHead className="w-10" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.creditosList.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm">{new Date(c.data_credito).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell><Badge variant={tipoBadge[c.tipo] as any}>{tipoLabels[c.tipo] || c.tipo}</Badge></TableCell>
                            <TableCell className="text-sm">{c.numero_documento || "—"}</TableCell>
                            <TableCell className="text-sm">{c.descricao}</TableCell>
                            <TableCell className={`text-sm text-right ${c.tipo === "reducao" ? "text-destructive" : ""}`}>
                              {c.tipo === "reducao" ? "- " : ""}{formatCurrency(c.valor)}
                            </TableCell>
                            {isNacional && (
                              <TableCell>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remover crédito?")) deleteCredito.mutate(c.id); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum crédito registrado.</p>
                  )}
                </div>

                {/* Empenhos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Empenhos Manuais</h4>
                    <Button size="sm" variant="outline" onClick={() => setEmpenhoDialog({ open: true, orcamentoId: item.id })}>
                      <Plus className="mr-1 h-3 w-3" /> Empenho
                    </Button>
                  </div>
                  {item.empenhosList.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Nº Empenho</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.empenhosList.map((emp: any) => (
                          <TableRow key={emp.id}>
                            <TableCell className="text-sm">{new Date(emp.data_empenho).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-sm">{emp.numero_empenho || "—"}</TableCell>
                            <TableCell className="text-sm">{emp.descricao}</TableCell>
                            <TableCell className="text-sm text-right">{formatCurrency(emp.valor)}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Remover empenho?")) deleteEmpenho.mutate(emp.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum empenho manual registrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DotacaoDialog open={dotacaoDialog.open} item={dotacaoDialog.item} regionais={allRegionais} exercicio={exercicio} onClose={() => setDotacaoDialog({ open: false })} onSave={(v: any) => saveDotacao.mutate(v)} saving={saveDotacao.isPending} />
      <CreditoDialog open={creditoDialog.open} orcamentoId={creditoDialog.orcamentoId} onClose={() => setCreditoDialog({ open: false })} onSave={(v: any) => saveCredito.mutate(v)} saving={saveCredito.isPending} />
      <EmpenhoDialog open={empenhoDialog.open} orcamentoId={empenhoDialog.orcamentoId} onClose={() => setEmpenhoDialog({ open: false })} onSave={(v: any) => saveEmpenho.mutate(v)} saving={saveEmpenho.isPending} />
    </div>
  );
}

function DotacaoDialog({ open, item, regionais, exercicio, onClose, onSave, saving }: any) {
  const [regionalId, setRegionalId] = useState("");
  const [ano, setAno] = useState(exercicio);
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const isEdit = !!item;

  // Query existing orcamentos for the selected year to filter out regionais that already have one
  const { data: orcamentosDoAno } = useQuery({
    queryKey: ["orcamento-anual-check", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_anual" as any)
        .select("regional_id")
        .eq("exercicio", ano);
      if (error) throw error;
      return data as any[];
    },
    enabled: open && !isEdit,
  });

  const regionaisDisponiveis = useMemo(() => {
    if (!regionais) return [];
    const usedIds = (orcamentosDoAno || []).map((o: any) => o.regional_id);
    return regionais.filter((r: any) => !usedIds.includes(r.id));
  }, [regionais, orcamentosDoAno]);

  useEffect(() => {
    if (open) {
      if (item) { setRegionalId(item.regional_id); setAno(item.exercicio); setValor(String(item.valor_dotacao)); setObs(item.observacoes || ""); }
      else { setRegionalId(""); setAno(exercicio); setValor(""); setObs(""); }
    }
  }, [open, item, exercicio]);

  // Reset regional selection when year changes
  useEffect(() => { if (!isEdit) setRegionalId(""); }, [ano, isEdit]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Editar Orçamento" : "Novo Orçamento Anual"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label>Exercício Financeiro</Label>
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{yearRange.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regional</Label>
                <Select value={regionalId} onValueChange={setRegionalId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {regionaisDisponiveis.length === 0 ? (
                      <SelectItem value="__none" disabled>Todas as regionais já possuem orçamento para {ano}</SelectItem>
                    ) : (
                      regionaisDisponiveis.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Valor da Dotação Inicial (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving || (!isEdit && (!regionalId || !valor))} onClick={() => onSave({ id: item?.id, regional_id: regionalId, exercicio: ano, valor_dotacao: Number(valor), observacoes: obs })}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditoDialog({ open, orcamentoId, onClose, onSave, saving }: any) {
  const [tipo, setTipo] = useState("inicial");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [doc, setDoc] = useState("");

  useEffect(() => { if (open) { setTipo("inicial"); setDescricao(""); setValor(""); setData(new Date().toISOString().slice(0, 10)); setDoc(""); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar Crédito Orçamentário</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inicial">Dotação Inicial</SelectItem>
                <SelectItem value="suplementacao">Suplementação</SelectItem>
                <SelectItem value="reducao">Redução / Contingenciamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nº Documento (opcional)</Label>
            <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving || !descricao || !valor} onClick={() => onSave({ orcamento_id: orcamentoId, tipo, descricao, valor: Number(valor), data_credito: data, numero_documento: doc })}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmpenhoDialog({ open, orcamentoId, onClose, onSave, saving }: any) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [numero, setNumero] = useState("");

  useEffect(() => { if (open) { setDescricao(""); setValor(""); setData(new Date().toISOString().slice(0, 10)); setNumero(""); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar Empenho</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Descrição</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data do Empenho</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Nº do Empenho (opcional)</Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving || !descricao || !valor} onClick={() => onSave({ orcamento_id: orcamentoId, descricao, valor: Number(valor), data_empenho: data, numero_empenho: numero })}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
