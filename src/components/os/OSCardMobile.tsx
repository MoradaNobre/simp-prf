import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Phone } from "lucide-react";

const statusColors: Record<string, string> = {
  aberta: "bg-info text-info-foreground",
  orcamento: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  autorizacao: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  execucao: "bg-accent text-accent-foreground",
  ateste: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  faturamento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  pagamento: "bg-success text-success-foreground",
  encerrada: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  aberta: "Aberta", orcamento: "Orçamento", autorizacao: "Aguard. Autorização",
  execucao: "Execução", ateste: "Receb. Serviço", faturamento: "Faturamento", pagamento: "Ateste", encerrada: "Encerrada",
};

const prioridadeColors: Record<string, string> = {
  baixa: "outline", media: "secondary", alta: "default", urgente: "destructive",
};

interface OSCardMobileProps {
  os: any;
  canManage: boolean;
  canDelete: boolean;
  onSelect: (os: any) => void;
  onEdit: (os: any) => void;
  onDelete: (id: string) => void;
}

export function OSCardMobile({ os, canManage, canDelete, onSelect, onEdit, onDelete }: OSCardMobileProps) {
  const uop = os.uops as any;
  const delegacia = uop?.delegacias;
  const regional = os.regionais || delegacia?.regionais;

  return (
    <Card className="cursor-pointer active:bg-muted/50 transition-colors" onClick={() => onSelect(os)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-muted-foreground">{os.codigo}</p>
            <p className="font-medium text-sm truncate">{os.titulo}</p>
          </div>
          <Badge variant={prioridadeColors[os.prioridade] as any} className="shrink-0 text-[10px]">
            {os.prioridade.charAt(0).toUpperCase() + os.prioridade.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[os.status] || "bg-muted text-muted-foreground"}`}>
            {statusLabels[os.status] || os.status}
          </span>
          {os.motivo_restituicao && (
            <span className="inline-flex items-center justify-center rounded-full h-4 w-4 text-[9px] font-bold bg-destructive text-destructive-foreground" title={`Restituída: ${os.motivo_restituicao}`}>
              R
            </span>
          )}
          {os.status === "pagamento" && (os.documentos_pagamento as any[])?.length > 0 && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Aguardando Pagamento
            </span>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-x-4">
            <span>{regional?.sigla || "—"} · {delegacia?.nome || "—"}</span>
            <span className="text-right">
              {new Date(os.data_abertura).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <span>{uop?.nome || "—"}</span>
            <span className="text-right font-medium text-foreground">
              {os.valor_orcamento > 0
                ? `R$ ${Number(os.valor_orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "—"}
            </span>
          </div>
          {os.solicitante_profile && (
            <div className="flex items-center gap-1 pt-0.5">
              <span className="truncate">{os.solicitante_profile.full_name || "—"}</span>
              {os.solicitante_profile.phone && (
                <a
                  href={`https://wa.me/55${os.solicitante_profile.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex items-center gap-0.5 hover:underline shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3 w-3" />
                  {os.solicitante_profile.phone.length === 11
                    ? `(${os.solicitante_profile.phone.slice(0, 2)}) ${os.solicitante_profile.phone.slice(2, 7)}-${os.solicitante_profile.phone.slice(7)}`
                    : os.solicitante_profile.phone.length === 10
                      ? `(${os.solicitante_profile.phone.slice(0, 2)}) ${os.solicitante_profile.phone.slice(2, 6)}-${os.solicitante_profile.phone.slice(6)}`
                      : os.solicitante_profile.phone}
                </a>
              )}
            </div>
          )}
          {(os.contratos as any)?.preposto_nome && (
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-muted-foreground text-[10px] font-medium">Preposto:</span>
              <span className="truncate">{(os.contratos as any).preposto_nome}</span>
              {(os.contratos as any).preposto_telefone && (
                <a
                  href={`https://wa.me/55${(os.contratos as any).preposto_telefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex items-center gap-0.5 hover:underline shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3 w-3" />
                  {((p: string) => p.length === 11
                    ? `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`
                    : p.length === 10
                      ? `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`
                      : p)((os.contratos as any).preposto_telefone)}
                </a>
              )}
            </div>
          )}
        </div>

        {canManage && (
          <div className="flex justify-end gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(os)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {canDelete && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(os.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
