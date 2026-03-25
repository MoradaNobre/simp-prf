import { useState } from "react";
import { Paperclip, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRevisoesOrcamento } from "@/hooks/useRevisoesOrcamento";
import { getSignedUrl } from "@/utils/storage";

function AnexoLink({ path, label }: { path: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const fileName = path.split("/").pop() || "arquivo";

  const handleClick = async () => {
    setLoading(true);
    try {
      const url = await getSignedUrl(path);
      if (url) window.open(url, "_blank");
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
      <span className="truncate">{label}</span>
      <span className="text-xs text-muted-foreground">({fileName})</span>
    </button>
  );
}

interface Props {
  osId: string;
}

export function OSRevisaoAnexos({ osId }: Props) {
  const { data: revisoes } = useRevisoesOrcamento(osId);

  const anexos = (revisoes || []).filter(r => r.arquivo_justificativa);

  if (anexos.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/50 p-3 space-y-2">
      <p className="text-sm font-medium flex items-center gap-1">
        <FileText className="h-4 w-4 text-muted-foreground" />
        Planilhas de Revisão Orçamentária
      </p>
      <div className="space-y-1">
        {anexos.map((rev) => (
          <div key={rev.id} className="flex items-center gap-2">
            <AnexoLink
              path={rev.arquivo_justificativa!}
              label={`Revisão ${rev.valor_anterior.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} → ${rev.valor_novo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
            />
            <Badge
              variant={
                rev.status === "pendente" ? "secondary" :
                rev.status === "aprovado" ? "default" : "destructive"
              }
              className="text-[10px] px-1.5 py-0"
            >
              {rev.status === "pendente" ? "Pendente" : rev.status === "aprovado" ? "Aprovada" : "Recusada"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
