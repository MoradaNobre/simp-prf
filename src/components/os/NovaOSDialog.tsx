import { useState } from "react";
import { isGlobalRole } from "@/utils/roles";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOS } from "@/hooks/useOrdensServico";
import { useContratos } from "@/hooks/useContratos";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useDelegacias, useUops } from "@/hooks/useHierarchy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaOSDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const profile = useUserProfile();
  const { data: role } = useUserRole();
  const createOS = useCreateOS();
  const { data: contratos = [] } = useContratos();

  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<string>("media");
  const [selectedRegionalId, setSelectedRegionalId] = useState("");
  const [delegaciaId, setDelegaciaId] = useState("");
  const [uopId, setUopId] = useState("");
  const [fotoAntes, setFotoAntes] = useState<File | null>(null);
  const [contratoId, setContratoId] = useState("");
  const [justificativaUrgente, setJustificativaUrgente] = useState("");
  const [localServico, setLocalServico] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isGestorGlobal = isGlobalRole(role);
  const userRegionais: any[] = (profile.data as any)?.regionais || [];
  const hasMultipleRegionais = userRegionais.length > 1;

  // For gestor_nacional with multiple regionals, use selected; otherwise use profile's single regional
  const regionalId = hasMultipleRegionais
    ? selectedRegionalId || undefined
    : isGestorGlobal && userRegionais.length === 1
      ? userRegionais[0]?.id
      : userRegionais.length === 1
        ? userRegionais[0]?.id
        : (profile.data as any)?.regional_id || undefined;

  const regionalLabel = hasMultipleRegionais
    ? (selectedRegionalId
        ? (() => {
            const r = userRegionais.find((r: any) => r.id === selectedRegionalId);
            return r ? `${r.sigla} — ${r.nome}` : "";
          })()
        : "")
    : userRegionais.length === 1
      ? `${userRegionais[0]?.sigla} — ${userRegionais[0]?.nome}`
      : (profile.data as any)?.regional
        ? `${(profile.data as any).regional.sigla} — ${(profile.data as any).regional.nome}`
        : "Nenhuma regional vinculada";

  const delegacias = useDelegacias(regionalId);
  const uops = useUops(delegaciaId || undefined);

  const reset = () => {
    setCategoria(""); setDescricao(""); setPrioridade("media");
    setSelectedRegionalId(""); setDelegaciaId(""); setUopId("");
    setFotoAntes(null); setContratoId(""); setJustificativaUrgente("");
    setLocalServico("");
  };

  const handleSubmit = async () => {
    if (!categoria || !descricao.trim() || !localServico.trim() || !user) return;
    if (prioridade === "urgente" && !justificativaUrgente.trim()) return;
    setSubmitting(true);
    try {
      let fotoUrl: string | null = null;
      if (fotoAntes) {
        const ext = fotoAntes.name.split(".").pop();
        const path = `antes/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("os-fotos").upload(path, fotoAntes);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("os-fotos").getPublicUrl(path);
        fotoUrl = urlData.publicUrl;
      }

      const categoriaLabels: Record<string, string> = {
        eletrica: "Elétrica",
        hidraulica: "Hidráulica",
        ar_condicionado: "Ar Condicionado",
        outro: "Outros",
      };

      const descricaoFinal = `[Local: ${localServico.trim()}]\n\n${prioridade === "urgente"
        ? `${descricao}\n\n[Justificativa de urgência]: ${justificativaUrgente.trim()}`
        : descricao}`;

      const result = await createOS.mutateAsync({
        titulo: categoriaLabels[categoria] || categoria,
        descricao: descricaoFinal,
        tipo: "corretiva" as any,
        prioridade: prioridade as any,
        uop_id: uopId || null,
        contrato_id: contratoId || null,
        solicitante_id: user.id,
        foto_antes: fotoUrl,
        codigo: "",
        regional_id: regionalId || null,
      } as any);

      // Notify gestor regional about new OS
      let emailWarning = false;
      if (result?.id) {
        try {
          const { data: notifyData, error: notifyError } = await supabase.functions.invoke("notify-os-transition", {
            body: { os_id: result.id, from_status: "", to_status: "aberta" },
          });
          if (notifyError) {
            emailWarning = true;
          } else if (notifyData && notifyData.success === false) {
            emailWarning = true;
          } else if (notifyData && notifyData.warning && notifyData.recipients?.length === 0) {
            emailWarning = true;
          }
        } catch {
          emailWarning = true;
        }
      }

      toast.success("OS criada com sucesso!");
      if (emailWarning) {
        toast.warning("A OS foi criada, mas a notificação por e-mail ao gestor regional pode não ter sido enviada. Verifique manualmente.", { duration: 8000 });
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao criar OS: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          <DialogDescription>Preencha os dados para abrir uma nova OS</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Categoria de Manutenção *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eletrica">Elétrica</SelectItem>
                <SelectItem value="hidraulica">Hidráulica</SelectItem>
                <SelectItem value="ar_condicionado">Ar Condicionado</SelectItem>
                <SelectItem value="outro">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o problema detalhadamente..." rows={3} />
          </div>

          <div>
            <Label>Setor / Andar / Sala *</Label>
            <Input value={localServico} onChange={(e) => setLocalServico(e.target.value)} placeholder="Ex: Bloco A, 2º andar, Sala 205" />
            {!localServico.trim() && localServico !== "" && (
              <p className="text-xs text-destructive mt-1">Este campo é obrigatório.</p>
            )}
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.os_prioridade.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {prioridade === "urgente" && (
            <div>
              <Label>Justificativa de Urgência *</Label>
              <Textarea
                value={justificativaUrgente}
                onChange={(e) => setJustificativaUrgente(e.target.value)}
                placeholder="Descreva o motivo da prioridade urgente..."
                rows={2}
              />
              {!justificativaUrgente.trim() && (
                <p className="text-xs text-destructive mt-1">A justificativa é obrigatória para prioridade urgente.</p>
              )}
            </div>
          )}

          <div>
            <Label>Regional</Label>
            {hasMultipleRegionais ? (
              <Select value={selectedRegionalId} onValueChange={(v) => { setSelectedRegionalId(v); setDelegaciaId(""); setUopId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a regional..." /></SelectTrigger>
                <SelectContent>
                  {userRegionais.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input value={regionalLabel} disabled className="bg-muted" />
                {!regionalId && (
                  <p className="text-xs text-destructive mt-1">Seu perfil não está vinculado a uma regional. Peça ao administrador.</p>
                )}
              </>
            )}
          </div>

          {regionalId && (
            <div>
              <Label>Delegacia</Label>
              <Select value={delegaciaId} onValueChange={(v) => { setDelegaciaId(v); setUopId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(delegacias.data || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {delegaciaId && (
            <div>
              <Label>UOP</Label>
              <Select value={uopId} onValueChange={setUopId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(uops.data || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Foto (antes)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFotoAntes(e.target.files?.[0] || null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !categoria || !descricao.trim() || !localServico.trim() || !regionalId || (prioridade === "urgente" && !justificativaUrgente.trim())}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
