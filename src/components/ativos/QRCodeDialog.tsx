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

  const footerText = "Ao escanear este QR Code, o usuário poderá abrir um chamado de manutenção, que será automaticamente encaminhado ao setor responsável.";

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
      const qrWidth = img.width;
      const headerHeight = 36;
      const dataHeight = 90;
      const footerHeight = 60;
      canvas.width = qrWidth + padding * 2;
      canvas.height = headerHeight + qrWidth + dataHeight + footerHeight + padding * 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header: MANUTENÇÃO spanning QR width
      const headerY = padding;
      ctx.fillStyle = "#000000";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      const cx = canvas.width / 2;
      // Scale font to fit QR width
      let fontSize = 22;
      while (ctx.measureText("MANUTENÇÃO").width > qrWidth && fontSize > 10) {
        fontSize--;
        ctx.font = `bold ${fontSize}px sans-serif`;
      }
      ctx.fillText("MANUTENÇÃO", cx, headerY + fontSize);

      // QR Code
      const qrY = headerY + headerHeight;
      ctx.drawImage(img, padding, qrY);

      // Asset data below QR
      let dy = qrY + qrWidth + 18;
      ctx.fillStyle = "#000000";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(uop.nome, cx, dy);
      dy += 16;

      if (delegaciaNome) {
        ctx.font = "12px sans-serif";
        ctx.fillText(delegaciaNome, cx, dy);
        dy += 14;
      }
      if (uop.endereco) {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(uop.endereco.slice(0, 60), cx, dy);
        dy += 14;
      }
      if (isAC && (uop.tombamento || uop.numero_serie)) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#333333";
        const info = [uop.tombamento && `Tomb: ${uop.tombamento}`, uop.numero_serie && `S/N: ${uop.numero_serie}`].filter(Boolean).join(" | ");
        ctx.fillText(info, cx, dy);
        dy += 14;
      }

      // Footer: justified text
      dy += 8;
      ctx.fillStyle = "#333333";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "left";
      const maxW = qrWidth;
      const words = footerText.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(test).width > maxW) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = 12;
      const startX = padding;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const ly = dy + i * lineHeight;
        // Justify all lines except the last
        if (i < lines.length - 1) {
          const wordsInLine = line.split(" ");
          if (wordsInLine.length <= 1) {
            ctx.fillText(line, startX, ly);
          } else {
            const totalTextWidth = wordsInLine.reduce((acc, w) => acc + ctx.measureText(w).width, 0);
            const totalSpacing = maxW - totalTextWidth;
            const spaceWidth = totalSpacing / (wordsInLine.length - 1);
            let x = startX;
            for (const w of wordsInLine) {
              ctx.fillText(w, x, ly);
              x += ctx.measureText(w).width + spaceWidth;
            }
          }
        } else {
          ctx.fillText(line, startX, ly);
        }
      }

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
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; margin:0; padding:20px; }
        .header { font-size:22px; font-weight:bold; letter-spacing:2px; margin-bottom:12px; text-transform:uppercase; }
        .label { margin-top:16px; text-align:center; }
        h3 { margin:0 0 4px; font-size:16px; }
        p { margin:2px 0; font-size:12px; color:#555; }
        .instrucao { margin-top:16px; font-size:11px; color:#333; max-width:200px; text-align:justify; line-height:1.5; }
      </style></head><body>
      <div class="header">MANUTENÇÃO</div>
      ${qrRef.current.innerHTML}
      <div class="label">
        <h3>${uop?.nome}</h3>
        ${delegaciaNome ? `<p>${delegaciaNome}</p>` : ""}
        ${regionalSigla ? `<p>${regionalSigla}</p>` : ""}
        ${uop?.endereco ? `<p>${uop.endereco}</p>` : ""}
        ${acInfo}
      </div>
      <p class="instrucao">${footerText}</p>
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
