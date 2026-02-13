import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function DefinirResponsavel() {
  const { osId } = useParams<{ osId: string }>();
  const [os, setOs] = useState<any>(null);
  const [contatos, setContatos] = useState<any[]>([]);
  const [selectedResponsavel, setSelectedResponsavel] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!osId) return;
      setLoading(true);
      setError(null);

      // Fetch OS with contract info
      const { data: osData, error: osErr } = await supabase
        .from("ordens_servico")
        .select("id, codigo, titulo, status, contrato_id, responsavel_execucao_id")
        .eq("id", osId)
        .single();

      if (osErr || !osData) {
        setError("Ordem de Serviço não encontrada.");
        setLoading(false);
        return;
      }

      if (osData.responsavel_execucao_id) {
        setSuccess(true);
        setLoading(false);
        setOs(osData);
        return;
      }

      if (!osData.contrato_id) {
        setError("Nenhum contrato vinculado a esta OS.");
        setLoading(false);
        return;
      }

      setOs(osData);

      // Fetch contatos from the contract
      const { data: contatosData } = await supabase
        .from("contrato_contatos")
        .select("id, nome, funcao")
        .eq("contrato_id", osData.contrato_id)
        .order("nome");

      setContatos(contatosData ?? []);
      setLoading(false);
    }
    load();
  }, [osId]);

  const handleSubmit = async () => {
    if (!selectedResponsavel || !osId) return;
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from("ordens_servico")
        .update({ responsavel_execucao_id: selectedResponsavel })
        .eq("id", osId);

      if (updateErr) throw updateErr;
      setSuccess(true);
    } catch (err: any) {
      setError("Erro ao definir responsável: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {success ? "Responsável Definido" : error ? "Erro" : "Definir Responsável pela Execução"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && !success && (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-12 w-12 text-primary" />
              <p className="text-muted-foreground">
                O responsável pela execução da OS <strong>{os?.codigo}</strong> foi definido com sucesso.
              </p>
            </div>
          )}

          {!success && !error && os && (
            <>
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground">{os.codigo}</span>
                  <Badge variant="secondary">{os.status}</Badge>
                </div>
                <p className="font-medium">{os.titulo}</p>
              </div>

              {contatos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  Nenhum responsável cadastrado no contrato. Adicione contatos ao contrato primeiro.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Responsável pela Execução</Label>
                    <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {contatos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}{c.funcao ? ` (${c.funcao})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={!selectedResponsavel || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Responsável
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
