import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function NovoChamadoQR() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uopId = searchParams.get("uop");

  useEffect(() => {
    if (loading) return;

    if (!uopId) {
      navigate("/app/chamados", { replace: true });
      return;
    }

    if (!user) {
      const redirectUrl = `/chamado/novo?uop=${encodeURIComponent(uopId)}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`, { replace: true });
      return;
    }

    navigate(`/app/chamados?novoUop=${encodeURIComponent(uopId)}`, { replace: true });
  }, [user, loading, uopId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
