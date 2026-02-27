import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Camera, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ScreenConfig {
  name: string;
  path: string;
  tabValue?: string; // if set, click this tab after navigation
  description: string;
}

const SCREENS: ScreenConfig[] = [
  // Public
  { name: "Landing Page", path: "/", description: "Página inicial pública do sistema" },
  { name: "Login", path: "/login", description: "Tela de autenticação" },

  // Dashboard tabs
  { name: "Dashboard — Chamados", path: "/app/dashboard", tabValue: "chamados", description: "Dashboard: aba de chamados" },
  { name: "Dashboard — Ordens de Serviço", path: "/app/dashboard", tabValue: "operacional", description: "Dashboard: aba de ordens de serviço" },
  { name: "Dashboard — Orçamento", path: "/app/dashboard", tabValue: "orcamento", description: "Dashboard: aba orçamentária" },
  { name: "Dashboard — Mapa", path: "/app/dashboard", tabValue: "mapa", description: "Dashboard: mapa nacional" },

  // Main modules
  { name: "Chamados", path: "/app/chamados", description: "Listagem e gestão de chamados" },
  { name: "Ordens de Serviço", path: "/app/ordens", description: "Listagem e gestão de ordens de serviço" },
  { name: "Agenda de Visitas", path: "/app/agenda", description: "Calendário de agendamentos de visitas" },

  // Relatórios tabs
  { name: "Relatórios — Execução", path: "/app/relatorios", tabValue: "execucao", description: "Relatórios: aba de execução" },
  { name: "Relatórios — Pagamento", path: "/app/relatorios", tabValue: "pagamento", description: "Relatórios: aba de pagamento" },

  // Contratos
  { name: "Contratos", path: "/app/contratos", description: "Gestão de contratos vigentes" },

  // Gestão Orçamento tabs
  { name: "Orçamento — Portaria", path: "/app/orcamento", tabValue: "loa", description: "Gestão do Orçamento: Portaria Orçamentária (LOA)" },
  { name: "Orçamento — Cotas", path: "/app/orcamento", tabValue: "dotacoes", description: "Gestão do Orçamento: Cotas por regional" },
  { name: "Orçamento — Solicitações", path: "/app/orcamento", tabValue: "solicitacoes", description: "Gestão do Orçamento: Solicitações de crédito" },

  // Gestão do Sistema tabs
  { name: "Gestão — Usuários", path: "/app/gestao", tabValue: "usuarios", description: "Gestão do Sistema: usuários e perfis" },
  { name: "Gestão — Regionais", path: "/app/gestao", tabValue: "regionais", description: "Gestão do Sistema: regionais" },
  { name: "Gestão — Delegacias", path: "/app/gestao", tabValue: "delegacias", description: "Gestão do Sistema: delegacias" },
  { name: "Gestão — UOPs", path: "/app/gestao", tabValue: "uops", description: "Gestão do Sistema: unidades operacionais" },
  { name: "Gestão — Limites Modalidade", path: "/app/gestao", tabValue: "limites", description: "Gestão do Sistema: limites por modalidade" },
  { name: "Gestão — Auditoria", path: "/app/gestao", tabValue: "logs", description: "Gestão do Sistema: logs de auditoria" },

  // Sobre
  { name: "Sobre o Sistema", path: "/app/sobre", description: "Informações e documentação do sistema" },
];

type ScreenStatus = "pending" | "capturing" | "done" | "error";

const VIEWPORT_WIDTH = 1920;
const CAPTURE_SCALE = 2;
const WAIT_MS = 3000;
const TAB_WAIT_MS = 1500;

export default function ExportarTelas() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentScreen, setCurrentScreen] = useState("");
  const [statuses, setStatuses] = useState<Record<string, ScreenStatus>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updateStatus = (name: string, status: ScreenStatus) => {
    setStatuses((prev) => ({ ...prev, [name]: status }));
  };

  const waitForIframeLoad = (iframe: HTMLIFrameElement): Promise<void> => {
    return new Promise((resolve) => {
      const onLoad = () => {
        iframe.removeEventListener("load", onLoad);
        setTimeout(resolve, WAIT_MS);
      };
      iframe.addEventListener("load", onLoad);
    });
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const clickTab = async (iframe: HTMLIFrameElement, tabValue: string) => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      // Radix tabs render buttons with role="tab" and a data-value or value attr
      const tab =
        doc.querySelector(`button[role="tab"][value="${tabValue}"]`) ||
        doc.querySelector(`[data-value="${tabValue}"][role="tab"]`) ||
        doc.querySelector(`button[value="${tabValue}"]`);
      if (tab) {
        (tab as HTMLElement).click();
        await delay(TAB_WAIT_MS);
      }
    } catch (err) {
      console.warn("Tab click failed:", err);
    }
  };

  const captureIframe = async (iframe: HTMLIFrameElement): Promise<HTMLCanvasElement | null> => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc?.body) return null;

      // Capture full page height
      const body = iframeDoc.body;
      const html = iframeDoc.documentElement;
      const fullHeight = Math.max(
        body.scrollHeight, body.offsetHeight,
        html.clientHeight, html.scrollHeight, html.offsetHeight
      );

      const canvas = await html2canvas(body, {
        width: VIEWPORT_WIDTH,
        height: fullHeight,
        windowWidth: VIEWPORT_WIDTH,
        windowHeight: fullHeight,
        scale: CAPTURE_SCALE,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      return canvas;
    } catch (err) {
      console.error("Error capturing iframe:", err);
      return null;
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!iframeRef.current) return;
    setIsGenerating(true);
    setProgress(0);
    setStatuses({});

    const iframe = iframeRef.current;
    const captures: { name: string; description: string; canvas: HTMLCanvasElement }[] = [];
    let lastPath = "";

    for (let i = 0; i < SCREENS.length; i++) {
      const screen = SCREENS[i];
      setCurrentScreen(screen.name);
      updateStatus(screen.name, "capturing");
      setProgress(Math.round((i / SCREENS.length) * 100));

      try {
        // Only navigate if path changed
        if (screen.path !== lastPath) {
          iframe.src = screen.path;
          await waitForIframeLoad(iframe);
          lastPath = screen.path;
        }

        // Click tab if needed
        if (screen.tabValue) {
          await clickTab(iframe, screen.tabValue);
        }

        const canvas = await captureIframe(iframe);
        if (canvas) {
          captures.push({ name: screen.name, description: screen.description, canvas });
          updateStatus(screen.name, "done");
        } else {
          updateStatus(screen.name, "error");
        }
      } catch (err) {
        console.error(`Error on ${screen.name}:`, err);
        updateStatus(screen.name, "error");
      }
    }

    // Build PDF
    if (captures.length > 0) {
      // First page dimensions (landscape A4-ish but matching content)
      const pageW = 1920;
      const pageH = 1080;

      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [pageW, pageH] });

      // Cover page
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.setFontSize(56);
      pdf.setTextColor(255, 255, 255);
      pdf.text("SIMP-PRF", pageW / 2, 380, { align: "center" });
      pdf.setFontSize(28);
      pdf.setTextColor(200, 210, 225);
      pdf.text("Sistema Integrado de Manutenção Predial", pageW / 2, 440, { align: "center" });
      pdf.text("Polícia Rodoviária Federal", pageW / 2, 480, { align: "center" });
      pdf.setFontSize(18);
      pdf.setTextColor(160, 175, 195);
      pdf.text(`Documentação Visual — ${captures.length} telas`, pageW / 2, 560, { align: "center" });
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageW / 2, 600, { align: "center" });
      pdf.text("Perfil: Gestor Master", pageW / 2, 640, { align: "center" });

      for (let i = 0; i < captures.length; i++) {
        const { name, description, canvas } = captures[i];

        // Calculate page dimensions based on canvas aspect ratio
        const canvasW = canvas.width / CAPTURE_SCALE;
        const canvasH = canvas.height / CAPTURE_SCALE;
        const headerH = 36;
        const imgPageW = pageW;
        const imgPageH = Math.max(pageH, canvasH * (imgPageW / canvasW) + headerH);

        pdf.addPage([imgPageW, imgPageH], "landscape");

        // Header bar
        pdf.setFillColor(30, 58, 95);
        pdf.rect(0, 0, imgPageW, headerH, "F");
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${i + 1}/${captures.length} — ${name}`, 16, 24);
        pdf.setFontSize(11);
        pdf.setTextColor(180, 195, 215);
        pdf.text(description, imgPageW - 16, 24, { align: "right" });

        // Image fills full width below header with no extra margins
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgH = imgPageH - headerH;
        pdf.addImage(imgData, "JPEG", 0, headerH, imgPageW, imgH);
      }

      pdf.save(`SIMP-PRF_Telas_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF gerado com ${captures.length} telas!`);
    } else {
      toast.error("Nenhuma tela foi capturada.");
    }

    setProgress(100);
    setCurrentScreen("");
    setIsGenerating(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Exportar Telas do Sistema</h1>
        <p className="text-muted-foreground text-sm">
          Gera um PDF paisagem com capturas de todas as {SCREENS.length} telas e abas do SIMP-PRF (perfil Gestor Master)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" /> Telas a Capturar ({SCREENS.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
            {SCREENS.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {statuses[s.name] === "capturing" && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Capturando
                    </Badge>
                  )}
                  {statuses[s.name] === "done" && (
                    <Badge variant="default" className="gap-1 bg-green-600">
                      <CheckCircle2 className="h-3 w-3" /> OK
                    </Badge>
                  )}
                  {statuses[s.name] === "error" && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Erro
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Capturando: <strong>{currentScreen}</strong>
                </span>
                <span className="font-mono text-xs">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF ({SCREENS.length} telas)...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF com Todas as {SCREENS.length} Telas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Hidden iframe for capturing — full viewport width */}
      <iframe
        ref={iframeRef}
        className="fixed -left-[9999px] top-0"
        style={{ width: VIEWPORT_WIDTH, height: 4000, border: "none" }}
        title="Captura de tela"
      />
    </div>
  );
}
