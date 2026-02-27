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
  description: string;
}

const SCREENS: ScreenConfig[] = [
  { name: "Landing Page", path: "/", description: "Página inicial pública do sistema" },
  { name: "Login", path: "/login", description: "Tela de autenticação" },
  { name: "Dashboard — Chamados", path: "/app/dashboard", description: "Painel principal, aba de chamados" },
  { name: "Chamados", path: "/app/chamados", description: "Listagem e gestão de chamados" },
  { name: "Ordens de Serviço", path: "/app/ordens", description: "Listagem e gestão de ordens de serviço" },
  { name: "Agenda de Visitas", path: "/app/agenda", description: "Calendário de agendamentos de visitas" },
  { name: "Relatórios OS", path: "/app/relatorios", description: "Relatórios de execução e pagamento" },
  { name: "Contratos", path: "/app/contratos", description: "Gestão de contratos vigentes" },
  { name: "Gestão do Orçamento", path: "/app/orcamento", description: "Portaria orçamentária, cotas e créditos" },
  { name: "Gestão do Sistema", path: "/app/gestao", description: "Usuários, regionais, delegacias, UOPs e auditoria" },
  { name: "Sobre o Sistema", path: "/app/sobre", description: "Informações e documentação do sistema" },
];

type ScreenStatus = "pending" | "capturing" | "done" | "error";

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
        // Wait extra time for React to render
        setTimeout(resolve, 2500);
      };
      iframe.addEventListener("load", onLoad);
    });
  };

  const captureIframe = async (iframe: HTMLIFrameElement): Promise<HTMLCanvasElement | null> => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc?.body) return null;

      const canvas = await html2canvas(iframeDoc.body, {
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
        scale: 1,
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

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080] });
    const iframe = iframeRef.current;
    const captures: { name: string; canvas: HTMLCanvasElement }[] = [];

    for (let i = 0; i < SCREENS.length; i++) {
      const screen = SCREENS[i];
      setCurrentScreen(screen.name);
      updateStatus(screen.name, "capturing");
      setProgress(Math.round(((i) / SCREENS.length) * 100));

      try {
        // Navigate iframe
        iframe.src = screen.path;
        await waitForIframeLoad(iframe);

        const canvas = await captureIframe(iframe);
        if (canvas) {
          captures.push({ name: screen.name, canvas });
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
      // Cover page
      pdf.setFontSize(48);
      pdf.setTextColor(30, 58, 95);
      pdf.text("SIMP-PRF", 960, 400, { align: "center" });
      pdf.setFontSize(24);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Sistema de Manutenção Predial", 960, 460, { align: "center" });
      pdf.text("Capturas de Tela do Sistema", 960, 510, { align: "center" });
      pdf.setFontSize(16);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 960, 580, { align: "center" });
      pdf.text(`Total de telas: ${captures.length}`, 960, 610, { align: "center" });

      for (let i = 0; i < captures.length; i++) {
        const { name, canvas } = captures[i];
        pdf.addPage([1920, 1080], "landscape");
        
        // Add label header
        pdf.setFillColor(30, 58, 95);
        pdf.rect(0, 0, 1920, 40, "F");
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${i + 1}/${captures.length} — ${name}`, 20, 27);

        // Add screenshot
        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        pdf.addImage(imgData, "JPEG", 0, 40, 1920, 1040);
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
          Gera um PDF com capturas de tela de todas as páginas do SIMP-PRF
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" /> Telas a Capturar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {SCREENS.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <div>
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
                Gerando PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF com Todas as Telas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Hidden iframe for capturing */}
      <iframe
        ref={iframeRef}
        className="fixed -left-[9999px] top-0"
        style={{ width: 1920, height: 1080, border: "none" }}
        title="Captura de tela"
      />
    </div>
  );
}
