import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockOS = [
  { id: "OS-001", titulo: "Ar-condicionado com defeito", unidade: "UOP Jaguariúna", status: "aberta", prioridade: "alta", data: "2026-02-10" },
  { id: "OS-002", titulo: "Reparo telhado - infiltração", unidade: "Del. Campinas", status: "execucao", prioridade: "urgente", data: "2026-02-08" },
  { id: "OS-003", titulo: "Troca lâmpadas corredor", unidade: "Sede Regional SP", status: "encerrada", prioridade: "baixa", data: "2026-02-05" },
];

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  triagem: "bg-warning text-warning-foreground",
  execucao: "bg-accent text-accent-foreground",
  encerrada: "bg-success text-success-foreground",
};

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  triagem: "Triagem",
  execucao: "Em Execução",
  encerrada: "Encerrada",
};

const prioridadeColors: Record<string, string> = {
  baixa: "outline",
  media: "secondary",
  alta: "default",
  urgente: "destructive",
};

export default function OrdensServico() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie todas as OS de manutenção</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova OS
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar OS..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
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
              {mockOS.map((os) => (
                <TableRow key={os.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{os.id}</TableCell>
                  <TableCell>{os.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{os.unidade}</TableCell>
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
                  <TableCell className="text-muted-foreground">{os.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
