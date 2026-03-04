import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { isAdminRole, isGlobalRole } from "@/utils/roles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Loader2, Map, Building2, MapPin, ScrollText, CreditCard, FileDown, Activity, Globe } from "lucide-react";
import GestaoUsuarios from "@/components/gestao/GestaoUsuarios";
import GestaoRegionais from "@/components/gestao/GestaoRegionais";
import GestaoDelegacias from "@/components/gestao/GestaoDelegacias";
import GestaoUops from "@/components/gestao/GestaoUops";
import GestaoAuditLogs from "@/components/gestao/GestaoAuditLogs";
import GestaoLimitesModalidade from "@/components/gestao/GestaoLimitesModalidade";
import GestaoMonitoramento from "@/components/gestao/GestaoMonitoramento";
import GestaoContratosGov from "@/components/gestao/GestaoContratosGov";
import ExportarTelas from "@/pages/ExportarTelas";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Gestao() {
  const { data: role, isLoading } = useUserRole();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isNacional = isAdminRole(role);
  const isRegional = role === "gestor_regional";

  if (!isNacional && !isRegional) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            Gestão do Sistema
          </h1>
          <p className="text-muted-foreground text-sm">
            {isNacional ? "Painel administrativo do SIMP-PRF" : "Gestão da sua regional"}
          </p>
        </div>
      </div>

      <Tabs defaultValue={isNacional ? "usuarios" : "delegacias"} className="w-full">
        <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="usuarios" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Usuários
          </TabsTrigger>
          {isNacional && (
            <TabsTrigger value="regionais" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Regionais
            </TabsTrigger>
          )}
          <TabsTrigger value="delegacias" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Delegacias
          </TabsTrigger>
          <TabsTrigger value="uops" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            UOPs
          </TabsTrigger>
          <TabsTrigger value="limites" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {isMobile ? "Limites" : "Limites Modalidade"}
          </TabsTrigger>
          {role === "gestor_master" && (
            <TabsTrigger value="exportar" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {isMobile ? "Exportar" : "Exportar Telas"}
            </TabsTrigger>
          )}
          {isNacional && (
            <TabsTrigger value="monitoramento" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {isMobile ? "Monitor" : "Monitoramento"}
            </TabsTrigger>
          )}
          {isNacional && (
            <TabsTrigger value="contratos-gov" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {isMobile ? "Gov.br" : "Contratos Gov"}
            </TabsTrigger>
          )}
          {isNacional && (
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <ScrollText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Auditoria
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="usuarios">
          <Card>
            <CardContent className="pt-6 px-3 sm:px-6">
              <GestaoUsuarios currentUserRole={role || "operador"} />
            </CardContent>
          </Card>
        </TabsContent>

        {isNacional && (
          <TabsContent value="regionais">
            <Card>
              <CardContent className="pt-6 px-3 sm:px-6">
                <GestaoRegionais />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="delegacias">
          <Card>
            <CardContent className="pt-6 px-3 sm:px-6">
              <GestaoDelegacias />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uops">
          <Card>
            <CardContent className="pt-6 px-3 sm:px-6">
              <GestaoUops />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limites">
          <Card>
            <CardContent className="pt-6 px-3 sm:px-6">
              <GestaoLimitesModalidade />
            </CardContent>
          </Card>
        </TabsContent>

        {role === "gestor_master" && (
          <TabsContent value="exportar">
            <Card>
              <CardContent className="pt-6 px-3 sm:px-6">
                <ExportarTelas />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isNacional && (
          <TabsContent value="monitoramento">
            <Card>
              <CardContent className="pt-6 px-3 sm:px-6">
                <GestaoMonitoramento />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isNacional && (
          <TabsContent value="logs">
            <Card>
              <CardContent className="pt-6 px-3 sm:px-6">
                <GestaoAuditLogs canDelete={isGlobalRole(role)} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
