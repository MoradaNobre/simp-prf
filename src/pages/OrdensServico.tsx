import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useOrdensServico, type OrdemServico } from "@/hooks/useOrdensServico";
import { NovaOSDialog } from "@/components/os/NovaOSDialog";
import { DetalhesOSDialog } from "@/components/os/DetalhesOSDialog";
import { Constants } from "@/integrations/supabase/types";

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  triagem: "bg-warning text-warning-foreground",
  execucao: "bg-accent text-accent-foreground",
  encerrada: "bg-success text-success-foreground",
};
const statusLabels: Record<string, string> = {
  aberta: "Aberta", triagem: "Triagem", execucao: "Em Execução", encerrada: "Encerrada",
};
const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

export default function OrdensServico() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [prioridadeFilter, setPrioridadeFilter] = useState("");
  const [novaOSOpen, setNovaOSOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);

  const { data: ordens, isLoading } = useOrdensServico({
    status: statusFilter || undefined,
    prioridade: prioridadeFilter || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">
            Gerencie todas as OS de manutenção
            {ordens && <span className="ml-1">({ordens.length} registros)</span>}
          </p>
        </div>
        <Button onClick={() => setNovaOSOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova OS
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar OS..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Constants.public.Enums.os_status.map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridadeFilter || "all"} onValueChange={(v) => setPrioridadeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Constants.public.Enums.os_prioridade.map((p) => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !ordens?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma OS encontrada. Crie uma nova OS para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((os) => (
                  <TableRow key={os.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOS(os)}>
                    <TableCell className="font-mono text-sm">{os.codigo}</TableCell>
                    <TableCell>{os.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">{(os.uops as any)?.nome || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[os.status]}`}>
                        {statusLabels[os.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={prioridadeColors[os.prioridade] as any}>
                        {os.prioridade.charAt(0).toUpperCase() + os.prioridade.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(os.data_abertura).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovaOSDialog open={novaOSOpen} onOpenChange={setNovaOSOpen} />
      <DetalhesOSDialog os={selectedOS} open={!!selectedOS} onOpenChange={(o) => { if (!o) setSelectedOS(null); }} />
    </div>
  );
}
