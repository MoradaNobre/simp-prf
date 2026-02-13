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
import { Loader2, Camera, DollarSign, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", triagem: "Triagem", execucao: "Em Execução", encerrada: "Encerrada",
};
const statusFlow = ["aberta", "triagem", "execucao", "encerrada"];
const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

// Map each status to which responsible field is set when advancing TO that status
const statusResponsavelField: Record<string, string> = {
  triagem: "responsavel_triagem_id",
  execucao: "responsavel_execucao_id",
  encerrada: "responsavel_encerramento_id",
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
  const canManage = role && !["operador", "preposto", "terceirizado"].includes(role);
  const canManageCustos = canManage || role === "terceirizado";
  const canUploadPhotos = canManage || role === "terceirizado";
  const canAdvanceStatus = canManage || role === "terceirizado";

  const [uploading, setUploading] = useState(false);
  const [custoDesc, setCustoDesc] = useState("");
  const [custoTipo, setCustoTipo] = useState("peca");
  const [custoValor, setCustoValor] = useState("");
  const [selectedResponsavel, setSelectedResponsavel] = useState("");
  const [selectedContratoId, setSelectedContratoId] = useState("");

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

  // Reset selected responsavel when OS changes
  useEffect(() => {
    setSelectedResponsavel("");
    setSelectedContratoId(os?.contrato_id ?? "");
  }, [os?.id, os?.contrato_id]);

  if (!os) return null;

  const currentIdx = statusFlow.indexOf(os.status);
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    if (nextStatus === "triagem" && !selectedContratoId) {
      toast.error("Vincule um contrato antes de avançar para Triagem");
      return;
    }
    try {
      const updates: any = { id: os.id, status: nextStatus };
      if (nextStatus === "encerrada") updates.data_encerramento = new Date().toISOString();
      if (nextStatus === "triagem") updates.contrato_id = selectedContratoId;
      
      const field = statusResponsavelField[nextStatus];
      if (field && selectedResponsavel) {
        updates[field] = selectedResponsavel;
      }

      await updateOS.mutateAsync(updates);
      toast.success(`Status alterado para ${statusLabels[nextStatus]}`);
      setSelectedResponsavel("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleUploadFotoDepois = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `depois/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("os-fotos").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("os-fotos").getPublicUrl(path);
      await updateOS.mutateAsync({ id: os.id, foto_depois: urlData.publicUrl });
      toast.success("Foto enviada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
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

  // Helper to get contato name by id
  const getContatoNome = (id: string | null | undefined) => {
    if (!id) return null;
    const c = contatos.find((ct) => ct.id === id);
    return c ? `${c.nome}${c.funcao ? ` (${c.funcao})` : ""}` : null;
  };

  // Show assigned responsáveis for completed stages
  const responsaveis = [
    { label: "Triagem", value: getContatoNome((os as any).responsavel_triagem_id) },
    { label: "Execução", value: getContatoNome((os as any).responsavel_execucao_id) },
    { label: "Encerramento", value: getContatoNome((os as any).responsavel_encerramento_id) },
  ].filter((r) => r.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{os.codigo}</span>
            {os.titulo}
          </DialogTitle>
          <DialogDescription>Detalhes e gestão da Ordem de Serviço</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Priority */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${os.status === "aberta" ? "bg-info text-info-foreground" : os.status === "triagem" ? "bg-warning text-warning-foreground" : os.status === "execucao" ? "bg-accent text-accent-foreground" : "bg-success text-success-foreground"}`}>
              {statusLabels[os.status]}
            </Badge>
            <Badge variant={prioridadeColors[os.prioridade] as any}>
              {prioridadeLabels[os.prioridade]}
            </Badge>
            <Badge variant="outline">{os.tipo === "corretiva" ? "Corretiva" : "Preventiva"}</Badge>
            {os.uops && <span className="text-sm text-muted-foreground">{(os.uops as any).nome}</span>}
          </div>

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
            {os.data_encerramento && (
              <div>
                <span className="text-muted-foreground">Encerramento:</span>{" "}
                {new Date(os.data_encerramento).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>

          {/* Responsáveis atribuídos */}
          {responsaveis.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Responsáveis por Etapa
              </Label>
              <div className="grid grid-cols-1 gap-1">
                {responsaveis.map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{r.label}:</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
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
            ) : os.status === "execucao" && canUploadPhotos && (
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

          {/* Status transition with contrato & responsável selection */}
          {canAdvanceStatus && nextStatus && (
            <>
              <Separator />
              <div className="space-y-3">
                {/* Vincular contrato na triagem */}
                {nextStatus === "triagem" && !os.contrato_id && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Vincular Contrato *</Label>
                    <Select value={selectedContratoId || "none"} onValueChange={(v) => setSelectedContratoId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {contratosAll.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.numero} — {c.empresa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">O contrato deve ser vinculado na triagem para controle de saldo.</p>
                  </div>
                )}

                {/* Responsável por etapa */}
                {contratoId && contatos.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Responsável pela etapa de {statusLabels[nextStatus]}</Label>
                    <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
                      <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                      <SelectContent>
                        {contatos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}{c.funcao ? ` (${c.funcao})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleAdvanceStatus} disabled={updateOS.isPending} className="w-full">
                  {updateOS.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Avançar para: {statusLabels[nextStatus]}
                </Button>
              </div>
            </>
          )}

          {/* Custos - only visible during execução or after */}
          {(os.status === "execucao" || os.status === "encerrada") && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <DollarSign className="h-4 w-4" /> Custos
                  {totalCustos > 0 && (
                    <span className="ml-auto text-muted-foreground">
                      Total: R$ {totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </h4>
                {(custos.data || []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span>{c.descricao} <span className="text-muted-foreground">({c.tipo})</span></span>
                    <span className="font-medium">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {canManageCustos && os.status === "execucao" && (
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Descrição" value={custoDesc} onChange={(e) => setCustoDesc(e.target.value)} className="flex-1" />
                    <Select value={custoTipo} onValueChange={setCustoTipo}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peca">Peça</SelectItem>
                        <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Valor" type="number" step="0.01" value={custoValor} onChange={(e) => setCustoValor(e.target.value)} className="w-24" />
                    <Button size="sm" onClick={handleAddCusto} disabled={addCusto.isPending}>+</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
