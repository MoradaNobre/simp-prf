import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Plus } from "lucide-react";

export default function Preventiva() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manutenção Preventiva</h1>
          <p className="text-muted-foreground">Planos PMOC e cronogramas de manutenção</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Planos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nenhum plano de manutenção preventiva cadastrado. Crie um plano para começar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
