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
import { useCreateChamado } from "@/hooks/useChamados";
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

const TIPOS_DEMANDA = [
  { value: "hidraulico", label: "Sistema Hidráulico", desc: "Falta de água, vazamentos, etc." },
  { value: "eletrico", label: "Sistema Elétrico", desc: "Curto circuito, tomadas com defeito, etc." },
  { value: "iluminacao", label: "Iluminação", desc: "Lâmpadas queimadas, não ligam, etc." },
  { value: "incendio", label: "Incêndio", desc: "Extintores vencidos, equipamentos defeituosos, etc." },
  { value: "estrutura", label: "Estrutura", desc: "Goteiras, rachaduras, concreto desplacando, etc." },
  { value: "rede_logica", label: "Rede Lógica", desc: "Instalações de pontos de rede, etc." },
  { value: "elevadores", label: "Elevadores", desc: "Elevador parado, com degrau, etc." },
  { value: "ar_condicionado", label: "Ar Condicionado", desc: "Não funciona, pingando, etc." },
  { value: "instalacoes_diversas", label: "Instalações Diversas", desc: "Divisórias, forro, suportes, dispensers, etc." },
  { value: "usina_solar", label: "Usina Solar", desc: "Painéis solares, inversores, cabeamento, etc." },
];

export function NovoChamadoDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const profile = useUserProfile();
  const { data: role } = useUserRole();
  const createChamado = useCreateChamado();

  const [tipoDemanda, setTipoDemanda] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localServico, setLocalServico] = useState("");
  const [prioridade, setPrioridade] = useState<string>("media");
  const [justificativaUrgente, setJustificativaUrgente] = useState("");
  const [selectedRegionalId, setSelectedRegionalId] = useState("");
  const [delegaciaId, setDelegaciaId] = useState("");
  const [uopId, setUopId] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [patrimonio, setPatrimonio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isGestorGlobal = isGlobalRole(role);
  const userRegionais: any[] = (profile.data as any)?.regionais || [];
  const hasMultipleRegionais = userRegionais.length > 1;

  const regionalId = hasMultipleRegionais
    ? selectedRegionalId || undefined
    : isGestorGlobal && userRegionais.length === 1
      ? userRegionais[0]?.id
      : userRegionais.length === 1
        ? userRegionais[0]?.id
        : (profile.data as any)?.regional_id || undefined;

  const regionalLabel = hasMultipleRegionais
    ? (selectedRegionalId
        ? (() => { const r = userRegionais.find((r: any) => r.id === selectedRegionalId); return r ? `${r.sigla} — ${r.nome}` : ""; })()
        : "")
    : userRegionais.length === 1
      ? `${userRegionais[0]?.sigla} — ${userRegionais[0]?.nome}`
      : (profile.data as any)?.regional
        ? `${(profile.data as any).regional.sigla} — ${(profile.data as any).regional.nome}`
        : "Nenhuma regional vinculada";

  const delegacias = useDelegacias(regionalId);
  const uops = useUops(delegaciaId || undefined);

  const reset = () => {
    setTipoDemanda(""); setDescricao(""); setLocalServico("");
    setPrioridade("media"); setJustificativaUrgente("");
    setSelectedRegionalId(""); setDelegaciaId(""); setUopId("");
    setFoto(null); setPatrimonio("");
  };

  const handleSubmit = async () => {
    if (!tipoDemanda || !descricao.trim() || !localServico.trim() || !user) return;
    if (tipoDemanda === "ar_condicionado" && !patrimonio.trim()) return;
    if (prioridade === "urgente" && !justificativaUrgente.trim()) return;
    setSubmitting(true);
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        const ext = foto.name.split(".").pop();
        const path = `chamados/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("os-fotos").upload(path, foto);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("os-fotos").getPublicUrl(path);
        fotoUrl = urlData.publicUrl;
      }

      const descFinal = patrimonio.trim()
        ? `${descricao.trim()}\n[Patrimônio Ar Condicionado]: ${patrimonio.trim()}`
        : descricao.trim();

      await createChamado.mutateAsync({
        tipo_demanda: tipoDemanda,
        descricao: descFinal,
        local_servico: localServico.trim(),
        prioridade,
        justificativa_urgente: prioridade === "urgente" ? justificativaUrgente.trim() : null,
        regional_id: regionalId || null,
        delegacia_id: delegaciaId || null,
        uop_id: uopId || null,
        foto: fotoUrl,
        solicitante_id: user.id,
      });

      toast.success("Chamado aberto com sucesso!");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao abrir chamado: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
          <DialogDescription>Abra um chamado de manutenção. Ele poderá ser agrupado em uma Ordem de Serviço.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Demanda *</Label>
            <Select value={tipoDemanda} onValueChange={setTipoDemanda}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo de demanda..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_DEMANDA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoDemanda === "ar_condicionado" && (
            <div>
              <Label>Patrimônio / Nº de Série do Ar Condicionado *</Label>
              <Input
                value={patrimonio}
                onChange={(e) => setPatrimonio(e.target.value)}
                placeholder="Informe o nº de patrimônio ou nº de série"
              />
              {!patrimonio.trim() && (
                <p className="text-xs text-destructive mt-1">O patrimônio ou número de série é obrigatório para Ar Condicionado.</p>
              )}
            </div>
          )}

          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o problema detalhadamente..." rows={3} />
          </div>

          <div>
            <Label>Setor / Andar / Sala *</Label>
            <Input value={localServico} onChange={(e) => setLocalServico(e.target.value)} placeholder="Ex: Bloco A, 2º andar, Sala 205" />
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
              <Textarea value={justificativaUrgente} onChange={(e) => setJustificativaUrgente(e.target.value)} placeholder="Descreva o motivo da prioridade urgente..." rows={2} />
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
                  <p className="text-xs text-destructive mt-1">Seu perfil não está vinculado a uma regional.</p>
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
            <Label>Foto</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !tipoDemanda || !descricao.trim() || !localServico.trim() || !regionalId || (prioridade === "urgente" && !justificativaUrgente.trim()) || (tipoDemanda === "ar_condicionado" && !patrimonio.trim())}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir Chamado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
