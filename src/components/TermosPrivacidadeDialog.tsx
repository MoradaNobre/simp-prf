import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TermosDialogProps {
  open: boolean;
  userId: string;
  onAccepted: () => void;
}

export function TermosPrivacidadeDialog({ open, userId, onAccepted }: TermosDialogProps) {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);

  const canAccept = acceptTerms && acceptPrivacy;

  const handleAccept = async () => {
    if (!canAccept) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ accepted_terms_at: new Date().toISOString() } as any)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Termos aceitos com sucesso!");
      onAccepted();
    } catch (err: any) {
      toast.error("Erro ao registrar aceite: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold">
            Termos de Uso e Política de Privacidade
          </DialogTitle>
          <DialogDescription>
            Para utilizar o SIMP-PRF, é necessário aceitar os termos de uso e a política de privacidade.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 max-h-[50vh]">
          <div className="space-y-6 py-4 text-sm text-foreground">
            {/* Termos de Uso */}
            <div>
              <h3 className="text-base font-bold mb-3">Termos de Uso</h3>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong className="text-foreground">1. Objeto:</strong> O SIMP-PRF destina-se exclusivamente ao uso de servidores da Polícia Rodoviária Federal (PRF) e empresas contratadas para finalidades institucionais de manutenção predial.
                </p>
                <p>
                  <strong className="text-foreground">2. Acesso:</strong> Requer credenciais válidas (@prf.gov.br para servidores ou credenciais fornecidas para empresas contratadas) e uso conforme políticas internas de segurança.
                </p>
                <p>
                  <strong className="text-foreground">3. Responsabilidades:</strong> O usuário deve manter sigilo das credenciais, usar apenas para fins institucionais e cumprir a legislação vigente, incluindo a Lei Geral de Proteção de Dados (LGPD).
                </p>
                <p>
                  <strong className="text-foreground">4. Proibições:</strong> É vedado o uso pessoal, compartilhamento de credenciais, acesso não autorizado a dados de outras regionais e atividades que prejudiquem o sistema ou comprometam a segurança da informação.
                </p>
                <p>
                  <strong className="text-foreground">5. Auditoria:</strong> Todas as ações realizadas no sistema são registradas em log de auditoria com identificação do usuário, data/hora e descrição da ação, conforme política de rastreabilidade institucional.
                </p>
              </div>
            </div>

            {/* Política de Privacidade */}
            <div>
              <h3 className="text-base font-bold mb-3">Política de Privacidade (LGPD)</h3>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Dados Coletados:</strong> Nome, e-mail institucional, telefone funcional, regional de lotação e dados técnicos de acesso (IP, navegador, timestamps).
                </p>
                <p>
                  <strong className="text-foreground">Finalidade:</strong> Autenticação, controle de acesso baseado em perfil (RBAC), execução das funcionalidades de gestão de manutenção predial, segurança da informação e cumprimento de obrigações legais.
                </p>
                <p>
                  <strong className="text-foreground">Base Legal:</strong> Execução de políticas públicas e cumprimento de obrigações legais (Art. 7º, II e III da LGPD — Lei nº 13.709/2018).
                </p>
                <p>
                  <strong className="text-foreground">Segurança:</strong> Dados criptografados em trânsito (HTTPS/TLS) e em repouso, com Row Level Security (RLS) por regional, backup automatizado e controle de acesso por sete níveis de perfil.
                </p>
                <p>
                  <strong className="text-foreground">Retenção:</strong> Os dados são mantidos enquanto o vínculo funcional ou contratual estiver ativo. Logs de auditoria são retidos indefinidamente para fins de conformidade.
                </p>
                <p>
                  <strong className="text-foreground">Compartilhamento:</strong> Limitado aos provedores de infraestrutura (Lovable Cloud) e órgãos de controle, quando legalmente exigido.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4 space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptTerms}
                onCheckedChange={(v) => setAcceptTerms(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug">
                Li e aceito os <strong>Termos de Uso</strong> do SIMP-PRF
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptPrivacy}
                onCheckedChange={(v) => setAcceptPrivacy(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug">
                Li e aceito a <strong>Política de Privacidade</strong> e autorizo o tratamento dos meus dados pessoais conforme a LGPD
              </span>
            </label>
          </div>

          <Button
            className="w-full"
            disabled={!canAccept || saving}
            onClick={handleAccept}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Aceitar e Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
