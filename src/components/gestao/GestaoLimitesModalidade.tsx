import { useState } from "react";
import { useLimitesModalidade, useUpsertLimiteModalidade, useDeleteLimiteModalidade } from "@/hooks/useLimitesModalidade";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { isGlobalRole } from "@/utils/roles";
import { useRegionais } from "@/hooks/useHierarchy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

const modalidadeOptions = [
  { value: "cartao_corporativo", label: "Cartão Corporativo" },
  { value: "contrata_brasil", label: "Contrata + Brasil" },
];

export default function GestaoLimitesModalidade() {
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const { data: allRegionais = [] } = useRegionais();
  const isGlobal = isGlobalRole(role);
  const userRegionais: any[] = (profile as any)?.regionais || [];
  const regionais = isGlobal ? allRegionais : userRegionais;

  const currentYear = new Date().getFullYear();
  const [selectedAno, setSelectedAno] = useState(currentYear);
  const [selectedRegionalId, setSelectedRegionalId] = useState(regionais.length === 1 ? regionais[0]?.id : "");
  const [newModalidade, setNewModalidade] = useState("");
  const [newValor, setNewValor] = useState("");

  const { data: limites = [], isLoading } = useLimitesModalidade(selectedRegionalId || null, selectedAno);
  const upsert = useUpsertLimiteModalidade();
  const deleteLimite = useDeleteLimiteModalidade();

  const handleAdd = async () => {
    if (!selectedRegionalId || !newModalidade || !newValor) {
      toast.error("Preencha todos os campos");
      return;
    }
    const existing = limites.find(l => l.modalidade === newModalidade);
    if (existing) {
      toast.error("Já existe um limite para esta modalidade neste ano/regional. Edite o existente.");
      return;
    }
    try {
      await upsert.mutateAsync({
        regional_id: selectedRegionalId,
        modalidade: newModalidade,
        ano: selectedAno,
        valor_limite: parseFloat(newValor),
      });
      toast.success("Limite cadastrado!");
      setNewModalidade("");
      setNewValor("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLimite.mutateAsync(id);
      toast.success("Limite removido!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const anos = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5 min-w-[180px]">
          <Label>Regional</Label>
          <Select value={selectedRegionalId} onValueChange={setSelectedRegionalId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {regionais.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.sigla} — {r.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Exercício</Label>
          <Select value={String(selectedAno)} onValueChange={(v) => setSelectedAno(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRegionalId && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Teto (R$)</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Nenhum limite cadastrado para este exercício.
                    </TableCell>
                  </TableRow>
                )}
                {limites.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {modalidadeOptions.find(m => m.value === l.modalidade)?.label || l.modalidade}
                    </TableCell>
                    <TableCell>
                      {Number(l.valor_limite).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)} disabled={deleteLimite.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3">Adicionar Limite</h4>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5 min-w-[180px]">
                <Label>Modalidade</Label>
                <Select value={newModalidade} onValueChange={setNewModalidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {modalidadeOptions.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor Limite (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newValor}
                  onChange={(e) => setNewValor(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <Button onClick={handleAdd} disabled={upsert.isPending} size="sm">
                {upsert.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Adicionar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
