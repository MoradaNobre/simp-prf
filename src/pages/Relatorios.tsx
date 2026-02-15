import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { RelatoriosExecucao } from "@/components/relatorios/RelatoriosExecucao";
import { RelatoriosPagamento } from "@/components/relatorios/RelatoriosPagamento";

export default function Relatorios() {
  const { data: role } = useUserRole();
  const isExternalOnly = role === "preposto" || role === "terceirizado";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Relatórios de Ordens de Serviço
        </p>
      </div>

      <Tabs defaultValue="execucao">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="execucao" className="flex-1 sm:flex-initial">OS - Execução</TabsTrigger>
          {!isExternalOnly && (
            <TabsTrigger value="pagamento" className="flex-1 sm:flex-initial">OS - Pagamento</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="execucao">
          <RelatoriosExecucao />
        </TabsContent>

        {!isExternalOnly && (
          <TabsContent value="pagamento">
            <RelatoriosPagamento />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
