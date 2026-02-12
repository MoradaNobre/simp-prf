import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search } from "lucide-react";

export default function Ativos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ativos</h1>
          <p className="text-muted-foreground">Cadastro hierárquico de unidades e equipamentos</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Ativo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ativo..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Hierarquia de Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Nenhum ativo cadastrado ainda. Importe seus dados ou adicione manualmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
