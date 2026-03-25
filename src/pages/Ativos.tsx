import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, ChevronRight, ChevronDown, MapPin, Loader2, QrCode, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { QRCodeDialog } from "@/components/ativos/QRCodeDialog";
import { NovoAtivoDialog, SEDE_NACIONAL_SIGLA } from "@/components/ativos/NovoAtivoDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Regional = { id: string; nome: string; sigla: string; uf: string };
type Delegacia = { id: string; nome: string; regional_id: string; municipio: string | null };
type Uop = { id: string; nome: string; delegacia_id: string; endereco: string | null; latitude: number | null; longitude: number | null; tipo_equipamento: string | null; tombamento: string | null; numero_serie: string | null };

function useAtivosData() {
  const regionais = useQuery({
    queryKey: ["regionais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("regionais").select("*").order("sigla");
      if (error) throw error;
      return data as Regional[];
    },
  });
  const delegacias = useQuery({
    queryKey: ["delegacias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delegacias").select("*").order("nome");
      if (error) throw error;
      return data as Delegacia[];
    },
  });
  const uops = useQuery({
    queryKey: ["uops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("uops").select("*").order("nome");
      if (error) throw error;
      return data as Uop[];
    },
  });
  return { regionais, delegacias, uops };
}

function TreeNode({ label, icon, children, count, defaultOpen = false }: {
  label: string; icon?: React.ReactNode; children?: React.ReactNode; count?: number; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!children;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors text-left">
          {hasChildren ? (open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />) : <span className="w-4" />}
          {icon}
          <span className="truncate font-medium">{label}</span>
          {count !== undefined && <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{count}</span>}
        </button>
      </CollapsibleTrigger>
      {hasChildren && (
        <CollapsibleContent>
          <div className="ml-4 border-l border-border pl-2">
            {children}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function Ativos() {
  const { regionais, delegacias, uops } = useAtivosData();
  const [search, setSearch] = useState("");
  const [qrUop, setQrUop] = useState<{ id: string; nome: string; endereco: string | null } | null>(null);
  const [qrDelegacia, setQrDelegacia] = useState("");
  const [qrRegional, setQrRegional] = useState("");
  const [novoAtivoOpen, setNovoAtivoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("regionais");

  const regData = regionais.data || [];
  const delData = delegacias.data || [];
  const uopData = uops.data || [];

  const sedeNacional = regData.find((r) => r.sigla === SEDE_NACIONAL_SIGLA);
  const regionaisSemSede = regData.filter((r) => r.sigla !== SEDE_NACIONAL_SIGLA);

  const filteredReg = search
    ? regionaisSemSede.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()) || r.sigla.toLowerCase().includes(search.toLowerCase()))
    : regionaisSemSede;

  const delsForReg = (regId: string) => delData.filter((d) => d.regional_id === regId);
  const uopsForDel = (delId: string) => uopData.filter((u) => u.delegacia_id === delId);

  const diretoriasNacionais = sedeNacional ? delsForReg(sedeNacional.id) : [];
  const filteredDiretorias = search
    ? diretoriasNacionais.filter((d) => d.nome.toLowerCase().includes(search.toLowerCase()))
    : diretoriasNacionais;

  const totalUnidades = regData.length + delData.length + uopData.length;

  const renderUopItem = (uop: Uop, del: Delegacia, reg: Regional, labelAnexo = false) => (
    <div key={uop.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/30 rounded-md group">
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{uop.nome}</span>
      {uop.endereco && <span className="ml-auto text-xs text-muted-foreground/60 truncate max-w-[200px]">{uop.endereco}</span>}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => { e.stopPropagation(); setQrUop(uop); setQrDelegacia(del.nome); setQrRegional(reg.sigla); }}
        title="Gerar QR Code"
      >
        <QrCode className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ativos</h1>
          <p className="text-muted-foreground">
            Cadastro hierárquico de unidades operacionais
            {totalUnidades > 0 && <span className="ml-2 text-xs">({totalUnidades} registros)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNovoAtivoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Ativo
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="regionais">Regionais</TabsTrigger>
          <TabsTrigger value="nacional">Sede Nacional</TabsTrigger>
        </TabsList>

        <TabsContent value="regionais">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Hierarquia Regional
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regionais.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : filteredReg.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {search ? "Nenhuma regional encontrada." : "Nenhuma regional cadastrada."}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredReg.map((reg) => {
                    const dels = delsForReg(reg.id);
                    return (
                      <TreeNode key={reg.id} label={`${reg.sigla} — ${reg.nome}`} icon={<Building2 className="h-4 w-4 text-primary shrink-0" />} count={dels.length}>
                        {dels.map((del) => {
                          const uopsForThis = uopsForDel(del.id);
                          return (
                            <TreeNode key={del.id} label={del.nome} icon={<Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />} count={uopsForThis.length}>
                              {uopsForThis.map((uop) => renderUopItem(uop, del, reg))}
                            </TreeNode>
                          );
                        })}
                      </TreeNode>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nacional">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="h-5 w-5" /> Sede Nacional — Diretorias e Anexos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {regionais.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : !sedeNacional ? (
                <p className="text-muted-foreground text-sm">
                  Sede Nacional ainda não cadastrada. Use o botão "Novo Ativo" → aba "Nacional" para criar uma diretoria.
                </p>
              ) : filteredDiretorias.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {search ? "Nenhuma diretoria encontrada." : "Nenhuma diretoria cadastrada na Sede Nacional."}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredDiretorias.map((dir) => {
                    const anexos = uopsForDel(dir.id);
                    return (
                      <TreeNode key={dir.id} label={dir.nome} icon={<Landmark className="h-4 w-4 text-primary shrink-0" />} count={anexos.length}>
                        {anexos.map((anexo) => renderUopItem(anexo, dir, sedeNacional, true))}
                      </TreeNode>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <QRCodeDialog
        open={!!qrUop}
        onOpenChange={(v) => !v && setQrUop(null)}
        uop={qrUop}
        delegaciaNome={qrDelegacia}
        regionalSigla={qrRegional}
      />

      <NovoAtivoDialog open={novoAtivoOpen} onOpenChange={setNovoAtivoOpen} />
    </div>
  );
}
