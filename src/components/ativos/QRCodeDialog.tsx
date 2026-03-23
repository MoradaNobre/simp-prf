import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uop: { id: string; nome: string; endereco?: string | null } | null;
  delegaciaNome?: string;
  regionalSigla?: string;
}

const BASE_URL = "https://simp-prf.lovable.app";

export function QRCodeDialog({ open, onOpenChange, uop, delegaciaNome, regionalSigla }: Props) {
  const qrRef = useRef<HTMLDivElement>(null);

  const url = uop ? `${BASE_URL}/chamado/novo?uop=${uop.id}` : "";

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
      const textHeight = 80;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + textHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      const cx = canvas.width / 2;
      ctx.fillText(uop.nome, cx, img.height + padding + 24);

      if (delegaciaNome) {
        ctx.font = "12px sans-serif";
        ctx.fillText(delegaciaNome, cx, img.height + padding + 44);
      }
      if (uop.endereco) {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(uop.endereco.slice(0, 60), cx, img.height + padding + 62);
      }

      const link = document.createElement("a");
      link.download = `qrcode-${uop.nome.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [uop, delegaciaNome]);

  const handlePrint = useCallback(() => {
    if (!qrRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>QR Code - ${uop?.nome}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:sans-serif; margin:0; }
        .label { margin-top:16px; text-align:center; }
        h3 { margin:0 0 4px; font-size:16px; }
        p { margin:2px 0; font-size:12px; color:#555; }
      </style></head><body>
      ${qrRef.current.innerHTML}
      <div class="label">
        <h3>${uop?.nome}</h3>
        ${delegaciaNome ? `<p>${delegaciaNome}</p>` : ""}
        ${regionalSigla ? `<p>${regionalSigla}</p>` : ""}
        ${uop?.endereco ? `<p>${uop.endereco}</p>` : ""}
      </div>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  }, [uop, delegaciaNome, regionalSigla]);

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
          </div>

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
