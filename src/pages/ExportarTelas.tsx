import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Camera, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ScreenAction {
  type: "click" | "tab";
  /** CSS selector or tab value */
  selector: string;
  wait?: number;
}

interface ScreenConfig {
  name: string;
  path: string;
  description: string;
  /** Actions to perform BEFORE capturing (tab clicks, button clicks) */
  actions?: ScreenAction[];
  /** Action to perform AFTER capturing (e.g. close dialog) */
  afterActions?: ScreenAction[];
}

const SCREENS: ScreenConfig[] = [
  // ── Public ──
  { name: "Landing Page", path: "/", description: "Página inicial pública do sistema" },
  { name: "Login", path: "/login", description: "Tela de autenticação" },

  // ── Dashboard ──
  { name: "Dashboard — Chamados", path: "/app/dashboard", description: "Dashboard: aba de chamados", actions: [{ type: "tab", selector: "chamados" }] },
  { name: "Dashboard — Ordens de Serviço", path: "/app/dashboard", description: "Dashboard: aba operacional", actions: [{ type: "tab", selector: "operacional" }] },
  { name: "Dashboard — Orçamento", path: "/app/dashboard", description: "Dashboard: aba orçamentária", actions: [{ type: "tab", selector: "orcamento" }] },
  { name: "Dashboard — Mapa", path: "/app/dashboard", description: "Dashboard: mapa nacional", actions: [{ type: "tab", selector: "mapa" }] },

  // ── Chamados ──
  { name: "Chamados", path: "/app/chamados", description: "Listagem e gestão de chamados" },
  {
    name: "Formulário — Novo Chamado",
    path: "/app/chamados",
    description: "Dialog de abertura de novo chamado",
    actions: [{ type: "click", selector: 'button:has(svg.lucide-plus)', wait: 1500 }],
    afterActions: [{ type: "click", selector: 'button[data-state="open"] ~ div button:has(svg.lucide-x), [role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg.lucide-x)', wait: 500 }],
  },

  // ── Ordens de Serviço ──
  { name: "Ordens de Serviço", path: "/app/ordens", description: "Listagem e gestão de ordens de serviço" },
  {
    name: "Formulário — Nova OS",
    path: "/app/ordens",
    description: "Dialog de criação de nova Ordem de Serviço",
    actions: [{ type: "click", selector: 'button:has(svg.lucide-plus)', wait: 1500 }],
    afterActions: [{ type: "click", selector: '[role="dialog"] button:has(svg.lucide-x)', wait: 500 }],
  },

  // ── Agenda ──
  { name: "Agenda de Visitas", path: "/app/agenda", description: "Calendário de agendamentos de visitas" },

  // ── Relatórios ──
  { name: "Relatórios — Execução", path: "/app/relatorios", description: "Relatórios: aba de execução", actions: [{ type: "tab", selector: "execucao" }] },
  { name: "Relatórios — Pagamento", path: "/app/relatorios", description: "Relatórios: aba de pagamento", actions: [{ type: "tab", selector: "pagamento" }] },

  // ── Contratos ──
  { name: "Contratos", path: "/app/contratos", description: "Gestão de contratos vigentes" },
  {
    name: "Formulário — Novo Contrato",
    path: "/app/contratos",
    description: "Dialog de cadastro de novo contrato",
    actions: [{ type: "click", selector: 'button:has(svg.lucide-plus)', wait: 1500 }],
    afterActions: [{ type: "click", selector: '[role="dialog"] button:has(svg.lucide-x)', wait: 500 }],
  },

  // ── Gestão Orçamento ──
  { name: "Orçamento — Portaria (LOA)", path: "/app/orcamento", description: "Gestão: Portaria Orçamentária", actions: [{ type: "tab", selector: "loa" }] },
  { name: "Orçamento — Cotas", path: "/app/orcamento", description: "Gestão: Cotas por regional", actions: [{ type: "tab", selector: "dotacoes" }] },
  { name: "Orçamento — Solicitações de Crédito", path: "/app/orcamento", description: "Gestão: Solicitações de crédito suplementar", actions: [{ type: "tab", selector: "solicitacoes" }] },

  // ── Gestão do Sistema ──
  { name: "Gestão — Usuários", path: "/app/gestao", description: "Gestão do Sistema: usuários e perfis", actions: [{ type: "tab", selector: "usuarios" }] },
  { name: "Gestão — Regionais", path: "/app/gestao", description: "Gestão do Sistema: regionais", actions: [{ type: "tab", selector: "regionais" }] },
  { name: "Gestão — Delegacias / Sedes Regionais", path: "/app/gestao", description: "Gestão do Sistema: delegacias e sedes regionais", actions: [{ type: "tab", selector: "delegacias" }] },
  { name: "Gestão — UOPs / Anexos", path: "/app/gestao", description: "Gestão do Sistema: UOPs e anexos", actions: [{ type: "tab", selector: "uops" }] },
  { name: "Gestão — Limites Modalidade", path: "/app/gestao", description: "Gestão do Sistema: limites por modalidade", actions: [{ type: "tab", selector: "limites" }] },
  { name: "Gestão — Auditoria", path: "/app/gestao", description: "Gestão do Sistema: logs de auditoria", actions: [{ type: "tab", selector: "logs" }] },

  // ── Manutenção Preventiva ──
  { name: "Manutenção Preventiva", path: "/app/preventiva", description: "Planos de manutenção preventiva" },

  // ── Sobre ──
  { name: "Sobre o Sistema", path: "/app/sobre", description: "Informações e documentação do sistema" },
];

type ScreenStatus = "pending" | "capturing" | "done" | "error";

const VIEWPORT_WIDTH = 1440;
const CAPTURE_SCALE = 2;
const WAIT_MS = 3500;

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

  const findTab = (doc: Document, tabValue: string): HTMLElement | null => {
    // Try multiple strategies to find Radix tab triggers
    const strategies = [
      () => doc.querySelector(`button[role="tab"][value="${tabValue}"]`),
      () => doc.querySelector(`[data-value="${tabValue}"][role="tab"]`),
      () => doc.querySelector(`button[value="${tabValue}"]`),
      () => doc.querySelector(`[role="tab"][data-radix-collection-item][value="${tabValue}"]`),
      () => {
        // Search all tab buttons and match by value attribute or data attribute
        const allTabs = doc.querySelectorAll('button[role="tab"]');
        for (const t of allTabs) {
          if (t.getAttribute("value") === tabValue || t.getAttribute("data-value") === tabValue) {
            return t;
          }
        }
        return null;
      },
    ];
    for (const strategy of strategies) {
      const el = strategy();
      if (el) return el as HTMLElement;
    }
    console.warn(`Tab not found: ${tabValue}`);
    return null;
  };

  const performAction = async (iframe: HTMLIFrameElement, action: ScreenAction) => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      if (action.type === "tab") {
        const tab = findTab(doc, action.selector);
        if (tab) {
          // Simulate full user interaction for Radix
          tab.focus();
          tab.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
          tab.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
          tab.click();
          console.log(`Tab clicked: ${action.selector}`);
        }
      } else if (action.type === "click") {
        const selectors = action.selector.split(",").map((s) => s.trim());
        for (const sel of selectors) {
          try {
            const el = doc.querySelector(sel);
            if (el) {
              (el as HTMLElement).click();
              break;
            }
          } catch {
            // selector may be invalid, skip
          }
        }
      }
      await delay(action.wait ?? 1500);
    } catch (err) {
      console.warn("Action failed:", err);
    }
  };

  /** Inject temporary CSS to prevent text truncation and overflow clipping */
  const injectCaptureStyles = (doc: Document): HTMLStyleElement | null => {
    try {
      const style = doc.createElement("style");
      style.id = "capture-fix";
      style.textContent = `
        /* Force all text to be fully visible for html2canvas */
        * {
          text-overflow: clip !important;
          overflow-wrap: break-word !important;
        }
        .truncate, [class*="truncate"] {
          overflow: visible !important;
          white-space: normal !important;
          text-overflow: unset !important;
        }
        .overflow-hidden, [class*="overflow-hidden"] {
          overflow: visible !important;
        }
        .line-clamp-1, .line-clamp-2, .line-clamp-3,
        [class*="line-clamp"] {
          -webkit-line-clamp: unset !important;
          display: block !important;
          overflow: visible !important;
        }
        /* Ensure sidebar and nav text is fully rendered */
        [data-sidebar] span, nav span, button span,
        [role="menuitem"] span, [role="tab"] {
          overflow: visible !important;
          white-space: nowrap !important;
          text-overflow: unset !important;
          min-width: fit-content !important;
        }
        /* Ensure badges and small elements are visible */
        .badge, [class*="badge"], [class*="Badge"] {
          overflow: visible !important;
          white-space: nowrap !important;
        }
      `;
      doc.head.appendChild(style);
      return style;
    } catch {
      return null;
    }
  };

  const removeCaptureStyles = (doc: Document) => {
    try {
      const style = doc.getElementById("capture-fix");
      if (style) style.remove();
    } catch { /* ignore */ }
  };

  const captureIframe = async (iframe: HTMLIFrameElement): Promise<HTMLCanvasElement | null> => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc?.body) return null;

      // Inject fix styles before capture
      injectCaptureStyles(iframeDoc);
      await delay(300); // Let styles apply

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

      // Clean up injected styles
      removeCaptureStyles(iframeDoc);

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

    for (let i = 0; i < SCREENS.length; i++) {
      const screen = SCREENS[i];
      setCurrentScreen(screen.name);
      updateStatus(screen.name, "capturing");
      setProgress(Math.round((i / SCREENS.length) * 100));

      try {
        // Always force reload to ensure clean state for each screen
        iframe.src = "about:blank";
        await delay(300);
        iframe.src = screen.path;
        await waitForIframeLoad(iframe);

        // Perform pre-capture actions (tabs, clicks)
        if (screen.actions) {
          for (const action of screen.actions) {
            await performAction(iframe, action);
          }
        }

        const canvas = await captureIframe(iframe);
        if (canvas) {
          captures.push({ name: screen.name, description: screen.description, canvas });
          updateStatus(screen.name, "done");
        } else {
          updateStatus(screen.name, "error");
        }

        // Perform after-capture actions (close dialogs)
        if (screen.afterActions) {
          for (const action of screen.afterActions) {
            await performAction(iframe, action);
          }
        }
      } catch (err) {
        console.error(`Error on ${screen.name}:`, err);
        updateStatus(screen.name, "error");
      }
    }

    // Build PDF — PORTRAIT
    if (captures.length > 0) {
      const pageW = 1440;
      const coverH = 2000;

      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [pageW, coverH] });

      // ─── Cover page ───
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, pageW, coverH, "F");
      pdf.setFontSize(64);
      pdf.setTextColor(255, 255, 255);
      pdf.text("SIMP-PRF", pageW / 2, 700, { align: "center" });
      pdf.setFontSize(32);
      pdf.setTextColor(200, 210, 225);
      pdf.text("Sistema Integrado de Manutenção Predial", pageW / 2, 780, { align: "center" });
      pdf.text("Polícia Rodoviária Federal", pageW / 2, 830, { align: "center" });
      pdf.setFontSize(22);
      pdf.setTextColor(160, 175, 195);
      pdf.text(`Documentação Visual — ${captures.length} telas capturadas`, pageW / 2, 940, { align: "center" });
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageW / 2, 990, { align: "center" });
      pdf.text("Perfil: Gestor Master", pageW / 2, 1040, { align: "center" });

      // ─── Table of contents ───
      pdf.addPage([pageW, coverH], "portrait");
      pdf.setFillColor(30, 58, 95);
      pdf.rect(0, 0, pageW, 80, "F");
      pdf.setFontSize(28);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Índice de Telas", pageW / 2, 52, { align: "center" });

      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      let tocY = 130;
      captures.forEach(({ name, description }, idx) => {
        if (tocY > coverH - 60) {
          pdf.addPage([pageW, coverH], "portrait");
          tocY = 60;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 58, 95);
        pdf.text(`${idx + 1}.`, 60, tocY);
        pdf.text(name, 100, tocY);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(13);
        pdf.text(description, 100, tocY + 22);
        pdf.setFontSize(16);
        tocY += 56;
      });

      // ─── Screen pages ───
      for (let i = 0; i < captures.length; i++) {
        const { name, description, canvas } = captures[i];

        const canvasW = canvas.width / CAPTURE_SCALE;
        const canvasH = canvas.height / CAPTURE_SCALE;
        const headerH = 50;
        const margin = 0;
        const imgW = pageW - margin * 2;
        const imgH = canvasH * (imgW / canvasW);
        const totalPageH = imgH + headerH;

        pdf.addPage([pageW, totalPageH], "portrait");

        // Header bar
        pdf.setFillColor(30, 58, 95);
        pdf.rect(0, 0, pageW, headerH, "F");
        pdf.setFontSize(18);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${i + 1}/${captures.length} — ${name}`, 20, 32);
        pdf.setFontSize(13);
        pdf.setTextColor(180, 195, 215);
        pdf.text(description, pageW - 20, 32, { align: "right" });

        // Screenshot fills full width
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", margin, headerH, imgW, imgH);
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
          Gera um PDF retrato com capturas de todas as {SCREENS.length} telas, formulários e abas do SIMP-PRF (perfil Gestor Master)
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

      {/* Hidden iframe for capturing */}
      <iframe
        ref={iframeRef}
        className="fixed -left-[9999px] top-0"
        style={{ width: VIEWPORT_WIDTH, height: 5000, border: "none" }}
        title="Captura de tela"
      />
    </div>
  );
}
