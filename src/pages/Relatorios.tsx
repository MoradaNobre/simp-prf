import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search, FileText } from "lucide-react";
import { generateOSReport } from "@/utils/generateOSReport";
import { toast } from "sonner";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";

export default function Relatorios() {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ["relatorios_os", effectiveRegionalId, search],
    queryFn: async () => {
      let q = supabase
        .from("relatorios_os")
        .select("*")
        .order("gerado_em", { ascending: false });

      if (effectiveRegionalId) {
        q = q.eq("regional_id", effectiveRegionalId);
      }

      if (search) {
        q = q.or(`codigo_os.ilike.%${search}%,titulo_os.ilike.%${search}%,contrato_empresa.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (relatorio: any) => {
    setDownloading(relatorio.id);
    try {
      const dados = relatorio.dados_json;

      // Fetch OS data to regenerate PDF
      const { data: os, error } = await supabase
        .from("ordens_servico")
        .select("*, uops(nome, delegacia_id, delegacias(nome, regional_id, regionais(sigla, nome))), regionais(sigla, nome)")
        .eq("id", relatorio.os_id)
        .single();

      if (error) throw error;

      // Fetch custos
      const { data: custos } = await supabase
        .from("os_custos")
        .select("descricao, tipo, valor")
        .eq("os_id", relatorio.os_id);

      generateOSReport({
        os: os as any,
        contrato: dados.contrato || null,
        custos: (custos || []).map((c: any) => ({ descricao: c.descricao, tipo: c.tipo, valor: Number(c.valor) })),
        responsaveis: dados.responsaveis || [],
        valorAtestado: relatorio.valor_atestado,
        geradoPor: dados.gerado_por_nome || "",
      });

      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">
          Relatórios de Ordens de Serviço encerradas
          {relatorios && <span className="ml-1">({relatorios.length} registros)</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, título ou empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canFilterRegional && (
          <RegionalFilterSelect value={selectedRegionalId} onChange={setSelectedRegionalId} />
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !relatorios?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum relatório encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código OS</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Valor Atestado</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.codigo_os}</TableCell>
                    <TableCell>{r.titulo_os}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.contrato_numero ? `${r.contrato_numero} — ${r.contrato_empresa}` : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(r.valor_atestado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.gerado_em).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(r)}
                        disabled={downloading === r.id}
                      >
                        {downloading === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
