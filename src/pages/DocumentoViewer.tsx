import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

const DOCS: Record<string, { title: string; file: string }> = {
  tecnico: {
    title: "Documentação Técnica",
    file: "/TECHNICAL_DOCS.md",
  },
  privacidade: {
    title: "Política de Privacidade",
    file: "/PRIVACY_POLICY.md",
  },
};

export default function DocumentoViewer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const docKey = params.get("doc") ?? "";
  const doc = DOCS[docKey];

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!doc) {
      setLoading(false);
      setError(true);
      return;
    }
    fetch(doc.file)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [doc]);

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Documento não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/app/sobre")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/sobre")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{doc.title}</h1>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-destructive text-center py-10">
          Erro ao carregar o documento.
        </p>
      )}

      {content && (
        <article className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-card p-6 md:p-8">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
