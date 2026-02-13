import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Loader2 } from "lucide-react";
import GestaoUsuarios from "@/components/gestao/GestaoUsuarios";

export default function Gestao() {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "gestor_nacional") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Gestão do Sistema
        </h1>
        <p className="text-muted-foreground">Painel administrativo do SIMP-PRF</p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <Card>
            <CardContent className="pt-6">
              <GestaoUsuarios />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
