import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uop: { id: string; nome: string; endereco?: string | null; tombamento?: string | null; numero_serie?: string | null; tipo_equipamento?: string | null } | null;
  delegaciaNome?: string;
  regionalSigla?: string;
}

const BASE_URL = "https://simp-prf.lovable.app";

export function QRCodeDialog({ open, onOpenChange, uop, delegaciaNome, regionalSigla }: Props) {
  const qrRef = useRef<HTMLDivElement>(null);

  const url = uop ? `${BASE_URL}/chamado/novo?uop=${uop.id}` : "";
  const isAC = uop?.tipo_equipamento === "ar_condicionado";

  const handleDownload = useCallback(() => {
    if (!qrRef.current || !uop) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const padding = 40;
      const textHeight = 100;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + textHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      const cx = canvas.width / 2;
      ctx.fillText(uop.nome, cx, img.height + padding + 20);

      if (delegaciaNome) {
        ctx.font = "12px sans-serif";
        ctx.fillText(delegaciaNome, cx, img.height + padding + 38);
      }
      if (uop.endereco) {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(uop.endereco.slice(0, 60), cx, img.height + padding + 54);
      }
      if (isAC && (uop.tombamento || uop.numero_serie)) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#333333";
        const info = [uop.tombamento && `Tomb: ${uop.tombamento}`, uop.numero_serie && `S/N: ${uop.numero_serie}`].filter(Boolean).join(" | ");
        ctx.fillText(info, cx, img.height + padding + 70);
      }

      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#0066cc";
      ctx.fillText("Escaneie para abrir chamado de manutenção", cx, img.height + padding + 88);

      const link = document.createElement("a");
      link.download = `qrcode-${uop.nome.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [uop, delegaciaNome, isAC]);

  const handlePrint = useCallback(() => {
    if (!qrRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const acInfo = isAC && (uop?.tombamento || uop?.numero_serie)
      ? `<p style="font-weight:600">${[uop.tombamento && `Tombamento: ${uop.tombamento}`, uop.numero_serie && `S/N: ${uop.numero_serie}`].filter(Boolean).join(" — ")}</p>`
      : "";

    printWindow.document.write(`
      <html><head><title>QR Code - ${uop?.nome}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; margin:0; }
        .label { margin-top:16px; text-align:center; }
        h3 { margin:0 0 4px; font-size:16px; }
        p { margin:2px 0; font-size:12px; color:#555; }
        .instrucao { margin-top:12px; font-size:11px; color:#0066cc; border:1px solid #0066cc; padding:6px 12px; border-radius:4px; }
      </style></head><body>
      ${qrRef.current.innerHTML}
      <div class="label">
        <h3>${uop?.nome}</h3>
        ${delegaciaNome ? `<p>${delegaciaNome}</p>` : ""}
        ${regionalSigla ? `<p>${regionalSigla}</p>` : ""}
        ${uop?.endereco ? `<p>${uop.endereco}</p>` : ""}
        ${acInfo}
      </div>
      <p class="instrucao">📱 Escaneie este QR Code para abrir um chamado de manutenção</p>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  }, [uop, delegaciaNome, regionalSigla, isAC]);

  if (!uop) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code — {uop.nome}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={url} size={200} level="M" />
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-0.5">
            {delegaciaNome && <p>{delegaciaNome}</p>}
            {regionalSigla && <p>{regionalSigla}</p>}
            {uop.endereco && <p className="text-xs">{uop.endereco}</p>}
            {isAC && (uop.tombamento || uop.numero_serie) && (
              <p className="text-xs font-medium text-foreground">
                {uop.tombamento && `Tomb: ${uop.tombamento}`}
                {uop.tombamento && uop.numero_serie && " — "}
                {uop.numero_serie && `S/N: ${uop.numero_serie}`}
              </p>
            )}
          </div>

          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs">
              Ao escanear este QR Code, o usuário será direcionado para abrir um chamado de manutenção com a localização e regional já preenchidas automaticamente.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Baixar PNG
            </Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
