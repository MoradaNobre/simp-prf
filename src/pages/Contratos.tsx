import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function Contratos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground">Gestão de contratos e custos com terceirizadas</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Contratos Vigentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nenhum contrato cadastrado. Adicione contratos com terceirizadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
