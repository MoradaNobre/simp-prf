import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const SEDE_NACIONAL_SIGLA = "SEDE NACIONAL";

interface NovoAtivoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoAtivoDialog({ open, onOpenChange }: NovoAtivoDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("uop");
  const [saving, setSaving] = useState(false);

  // UOP form
  const [uopNome, setUopNome] = useState("");
  const [uopEndereco, setUopEndereco] = useState("");
  const [uopDelegaciaId, setUopDelegaciaId] = useState("");

  // Delegacia form
  const [delNome, setDelNome] = useState("");
  const [delMunicipio, setDelMunicipio] = useState("");
  const [delRegionalId, setDelRegionalId] = useState("");

  // Regional form
  const [regNome, setRegNome] = useState("");
  const [regSigla, setRegSigla] = useState("");
  const [regUf, setRegUf] = useState("");

  // Nacional form
  const [nacTipo, setNacTipo] = useState<"diretoria" | "anexo">("diretoria");
  const [nacNome, setNacNome] = useState("");
  const [nacEndereco, setNacEndereco] = useState("");
  const [nacDiretoriaId, setNacDiretoriaId] = useState("");

  const regionais = useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionais").select("id, nome, sigla").order("sigla");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const delegacias = useQuery({
    queryKey: ["delegacias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delegacias").select("id, nome, regional_id").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const sedeNacional = (regionais.data || []).find((r) => r.sigla === SEDE_NACIONAL_SIGLA);
  const diretoriasNacionais = (delegacias.data || []).filter((d) => sedeNacional && d.regional_id === sedeNacional.id);
  const regionaisSemSede = (regionais.data || []).filter((r) => r.sigla !== SEDE_NACIONAL_SIGLA);
  const delegaciasSemSede = (delegacias.data || []).filter((d) => !sedeNacional || d.regional_id !== sedeNacional.id);

  const resetForms = () => {
    setUopNome(""); setUopEndereco(""); setUopDelegaciaId("");
    setDelNome(""); setDelMunicipio(""); setDelRegionalId("");
    setRegNome(""); setRegSigla(""); setRegUf("");
    setNacNome(""); setNacEndereco(""); setNacDiretoriaId(""); setNacTipo("diretoria");
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["regionais"] });
    queryClient.invalidateQueries({ queryKey: ["delegacias"] });
    queryClient.invalidateQueries({ queryKey: ["uops"] });
  };

  const ensureSedeNacional = async (): Promise<string | null> => {
    if (sedeNacional) return sedeNacional.id;
    // Auto-create the SEDE-NAC regional
    const { data, error } = await supabase.from("regionais").insert({
      nome: "Sede Nacional da PRF",
      sigla: SEDE_NACIONAL_SIGLA,
      uf: "DF",
    }).select("id").single();
    if (error) { toast.error("Erro ao criar registro da Sede Nacional: " + error.message); return null; }
    return data.id;
  };

  const handleSaveUop = async () => {
    if (!uopNome.trim() || !uopDelegaciaId) {
      toast.error("Preencha o nome e selecione a delegacia.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("uops").insert({
      nome: uopNome.trim(),
      endereco: uopEndereco.trim() || null,
      delegacia_id: uopDelegaciaId,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao cadastrar UOP: " + error.message); return; }
    toast.success("UOP cadastrada com sucesso!");
    invalidateAll();
    resetForms();
    onOpenChange(false);
  };

  const handleSaveDelegacia = async () => {
    if (!delNome.trim() || !delRegionalId) {
      toast.error("Preencha o nome e selecione a regional.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("delegacias").insert({
      nome: delNome.trim(),
      municipio: delMunicipio.trim() || null,
      regional_id: delRegionalId,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao cadastrar Delegacia: " + error.message); return; }
    toast.success("Delegacia cadastrada com sucesso!");
    invalidateAll();
    resetForms();
    onOpenChange(false);
  };

  const handleSaveRegional = async () => {
    if (!regNome.trim() || !regSigla.trim() || !regUf.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (regUf.length !== 2) {
      toast.error("UF deve ter exatamente 2 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("regionais").insert({
      nome: regNome.trim(),
      sigla: regSigla.trim().toUpperCase(),
      uf: regUf.trim().toUpperCase(),
    });
    setSaving(false);
    if (error) { toast.error("Erro ao cadastrar Regional: " + error.message); return; }
    toast.success("Regional cadastrada com sucesso!");
    invalidateAll();
    resetForms();
    onOpenChange(false);
  };

  const handleSaveNacional = async () => {
    if (nacTipo === "diretoria") {
      if (!nacNome.trim()) { toast.error("Preencha o nome da diretoria."); return; }
      setSaving(true);
      const sedeId = await ensureSedeNacional();
      if (!sedeId) { setSaving(false); return; }
      const { error } = await supabase.from("delegacias").insert({
        nome: nacNome.trim(),
        municipio: "Brasília",
        regional_id: sedeId,
      });
      setSaving(false);
      if (error) { toast.error("Erro ao cadastrar Diretoria: " + error.message); return; }
      toast.success("Diretoria cadastrada com sucesso!");
    } else {
      if (!nacNome.trim() || !nacDiretoriaId) { toast.error("Preencha o nome e selecione a diretoria."); return; }
      setSaving(true);
      const { error } = await supabase.from("uops").insert({
        nome: nacNome.trim(),
        endereco: nacEndereco.trim() || null,
        delegacia_id: nacDiretoriaId,
      });
      setSaving(false);
      if (error) { toast.error("Erro ao cadastrar Anexo: " + error.message); return; }
      toast.success("Anexo cadastrado com sucesso!");
    }
    invalidateAll();
    resetForms();
    onOpenChange(false);
  };

  const UF_LIST = [
    "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
    "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Ativo</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="nacional" className="flex-1">Nacional</TabsTrigger>
            <TabsTrigger value="uop" className="flex-1">UOP / Anexo</TabsTrigger>
            <TabsTrigger value="delegacia" className="flex-1">Delegacia</TabsTrigger>
            <TabsTrigger value="regional" className="flex-1">Regional</TabsTrigger>
          </TabsList>

          <TabsContent value="nacional" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Tipo de Ativo *</Label>
              <Select value={nacTipo} onValueChange={(v) => { setNacTipo(v as "diretoria" | "anexo"); setNacNome(""); setNacEndereco(""); setNacDiretoriaId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diretoria">Diretoria</SelectItem>
                  <SelectItem value="anexo">Anexo / Edifício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{nacTipo === "diretoria" ? "Nome da Diretoria" : "Nome do Anexo"} *</Label>
              <Input value={nacNome} onChange={(e) => setNacNome(e.target.value)} placeholder={nacTipo === "diretoria" ? "Ex: Diretoria de Operações" : "Ex: Edifício Sede Anexo II"} />
            </div>
            {nacTipo === "anexo" && (
              <>
                <div className="space-y-2">
                  <Label>Diretoria *</Label>
                  <Select value={nacDiretoriaId} onValueChange={setNacDiretoriaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a diretoria" /></SelectTrigger>
                    <SelectContent>
                      {diretoriasNacionais.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={nacEndereco} onChange={(e) => setNacEndereco(e.target.value)} placeholder="Endereço (opcional)" />
                </div>
              </>
            )}
            <Button className="w-full" onClick={handleSaveNacional} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {nacTipo === "diretoria" ? "Cadastrar Diretoria" : "Cadastrar Anexo"}
            </Button>
          </TabsContent>

          <TabsContent value="uop" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome da UOP *</Label>
              <Input value={uopNome} onChange={(e) => setUopNome(e.target.value)} placeholder="Ex: UOP Centro" />
            </div>
            <div className="space-y-2">
              <Label>Delegacia *</Label>
              <Select value={uopDelegaciaId} onValueChange={setUopDelegaciaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a delegacia" /></SelectTrigger>
                <SelectContent>
                  {delegaciasSemSede.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={uopEndereco} onChange={(e) => setUopEndereco(e.target.value)} placeholder="Endereço (opcional)" />
            </div>
            <Button className="w-full" onClick={handleSaveUop} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar UOP
            </Button>
          </TabsContent>

          <TabsContent value="delegacia" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome da Delegacia *</Label>
              <Input value={delNome} onChange={(e) => setDelNome(e.target.value)} placeholder="Ex: Delegacia de Goiânia" />
            </div>
            <div className="space-y-2">
              <Label>Regional *</Label>
              <Select value={delRegionalId} onValueChange={setDelRegionalId}>
                <SelectTrigger><SelectValue placeholder="Selecione a regional" /></SelectTrigger>
                <SelectContent>
                  {regionaisSemSede.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Município</Label>
              <Input value={delMunicipio} onChange={(e) => setDelMunicipio(e.target.value)} placeholder="Município (opcional)" />
            </div>
            <Button className="w-full" onClick={handleSaveDelegacia} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar Delegacia
            </Button>
          </TabsContent>

          <TabsContent value="regional" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome da Regional *</Label>
              <Input value={regNome} onChange={(e) => setRegNome(e.target.value)} placeholder="Ex: Superintendência Regional em Goiás" />
            </div>
            <div className="space-y-2">
              <Label>Sigla *</Label>
              <Input value={regSigla} onChange={(e) => setRegSigla(e.target.value)} placeholder="Ex: SRPRF-GO" maxLength={15} />
            </div>
            <div className="space-y-2">
              <Label>UF *</Label>
              <Select value={regUf} onValueChange={setRegUf}>
                <SelectTrigger><SelectValue placeholder="Selecione a UF" /></SelectTrigger>
                <SelectContent>
                  {UF_LIST.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveRegional} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar Regional
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
