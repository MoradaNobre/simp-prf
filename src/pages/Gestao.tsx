import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useQueryClient } from "@tanstack/react-query";
import { isAdminRole, isGlobalRole } from "@/utils/roles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Loader2, Map, Building2, MapPin, Upload, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import GestaoUsuarios from "@/components/gestao/GestaoUsuarios";
import GestaoRegionais from "@/components/gestao/GestaoRegionais";
import GestaoDelegacias from "@/components/gestao/GestaoDelegacias";
import GestaoUops from "@/components/gestao/GestaoUops";
import GestaoAuditLogs from "@/components/gestao/GestaoAuditLogs";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Gestao() {
  const { data: role, isLoading } = useUserRole();
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      let csvText: string;
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        csvText = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
      } else {
        csvText = await file.text();
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login para importar"); return; }
      const { data, error } = await supabase.functions.invoke("import-csv", { body: { data: csvText } });
      if (error) throw error;
      toast.success(`Importados: ${data.regionais} regionais, ${data.delegacias} delegacias, ${data.uops} UOPs`);
      queryClient.invalidateQueries({ queryKey: ["regionais"] });
      queryClient.invalidateQueries({ queryKey: ["delegacias"] });
      queryClient.invalidateQueries({ queryKey: ["uops"] });
    } catch (err: any) {
      toast.error("Erro ao importar: " + (err.message || err));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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
        {isNacional && (
          <div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isMobile ? "Importar" : "Importar Planilha"}
            </Button>
          </div>
        )}
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
