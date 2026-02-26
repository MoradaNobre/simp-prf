import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

export function AppRedirect() {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role === "gestor_nacional" || role === "gestor_master") {
    return <Navigate to="/app/orcamento" replace />;
  }

  if (role === "operador" || role === "fiscal_contrato" || role === "gestor_regional") {
    return <Navigate to="/app/chamados" replace />;
  }

  return <Navigate to="/app/ordens" replace />;
}
