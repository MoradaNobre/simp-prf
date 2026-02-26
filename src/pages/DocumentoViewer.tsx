import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Lock } from "lucide-react";

const DOCS: Record<string, { title: string; file: string; icon: "file" | "lock" }> = {
  tecnico: {
    title: "Documentação Técnica",
    file: "/TECHNICAL_DOCS.md",
    icon: "file",
  },
  privacidade: {
    title: "Política de Privacidade",
    file: "/PRIVACY_POLICY.md",
    icon: "lock",
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

  const IconComp = doc.icon === "lock" ? Lock : FileText;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/sobre")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <IconComp className="h-5 w-5 text-primary" />
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
        <article className="doc-viewer rounded-lg border border-border bg-card p-6 md:p-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-foreground border-b border-border pb-3 mb-6 mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-foreground border-b border-border/50 pb-2 mb-4 mt-8">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-foreground mb-3 mt-6">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-base font-semibold text-foreground mb-2 mt-4">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="text-sm text-muted-foreground list-disc pl-6 mb-4 space-y-1.5">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="text-sm text-muted-foreground list-decimal pl-6 mb-4 space-y-1.5">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="my-6 border-border" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/30 pl-4 my-4 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className}>{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs mb-4">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4 rounded-lg border border-border">
                  <table className="w-full text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground border-b border-border">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-sm text-muted-foreground border-b border-border/50">
                  {children}
                </td>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
              ),
              em: ({ children }) => (
                <em className="italic text-muted-foreground">{children}</em>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
