import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Search, Mail, MailX } from "lucide-react";
import { downloadOSExecucaoReport } from "@/utils/generateOSExecucaoReport";
import { toast } from "sonner";
import { useRegionalFilter } from "@/hooks/useRegionalFilter";
import { RegionalFilterSelect } from "@/components/RegionalFilterSelect";

export function RelatoriosExecucao() {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const { canFilterRegional, effectiveRegionalId, selectedRegionalId, setSelectedRegionalId } = useRegionalFilter();

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ["relatorios_execucao", effectiveRegionalId, search],
    queryFn: async () => {
      let q = supabase
        .from("relatorios_execucao")
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
      downloadOSExecucaoReport({
        codigo: relatorio.codigo_os,
        titulo: relatorio.titulo_os,
        tipo: dados.tipo || "corretiva",
        descricao: dados.descricao || "",
        localNome: dados.localNome || "—",
        regionalNome: dados.regionalNome || "",
        regionalSigla: dados.regionalSigla || "",
        solicitanteNome: dados.solicitanteNome || "",
        valorOrcamento: relatorio.valor_orcamento,
        contratoNumero: relatorio.contrato_numero || undefined,
        contratoEmpresa: relatorio.contrato_empresa || undefined,
        responsavelExecucaoNome: dados.responsavelExecucaoNome || undefined,
        dataAbertura: dados.dataAbertura || "",
        dataAutorizacao: dados.dataAutorizacao || undefined,
        fiscalNome: dados.fiscalNome || undefined,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
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
              Nenhum relatório de execução encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código OS</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
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
                      R$ {Number(r.valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.gerado_em).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {r.email_enviado ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Mail className="h-3 w-3" /> Enviado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <MailX className="h-3 w-3" /> Não enviado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(r)}
                        disabled={downloading === r.id}
                        title="Baixar PDF"
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
