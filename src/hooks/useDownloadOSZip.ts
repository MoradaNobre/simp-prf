import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import { generateOSReport } from "@/utils/generateOSReport";
import { generateOSExecucaoReport } from "@/utils/generateOSExecucaoReport";
import { getSignedUrl } from "@/utils/storage";

export function useDownloadOSZip() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadZip = async (os: { id: string; codigo: string; foto_antes?: string | null; foto_depois?: string | null; arquivo_orcamento?: string | null; documentos_pagamento?: any }) => {
    setDownloadingId(os.id);
    try {
      const zip = new JSZip();
      const fetchFile = async (url: string, name: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const blob = await res.blob();
          zip.file(name, blob);
        } catch { /* skip */ }
      };

      const promises: Promise<void>[] = [];

      if (os.foto_antes) {
        promises.push((async () => {
          const signed = await getSignedUrl(os.foto_antes!);
          if (signed) await fetchFile(signed, "foto_antes.jpg");
        })());
      }
      if (os.foto_depois) {
        promises.push((async () => {
          const signed = await getSignedUrl(os.foto_depois!);
          if (signed) await fetchFile(signed, "foto_depois.jpg");
        })());
      }
      if (os.arquivo_orcamento) {
        promises.push((async () => {
          const signed = await getSignedUrl(os.arquivo_orcamento!);
          if (signed) await fetchFile(signed, "orcamento.pdf");
        })());
      }

      const docs: string[] = (os.documentos_pagamento as string[]) || [];
      docs.forEach((path, i) => {
        promises.push((async () => {
          const signed = await getSignedUrl(path);
          if (signed) await fetchFile(signed, `pagamento/documento_${i + 1}.pdf`);
        })());
      });

      // Relatório de Pagamento
      const { data: relatoriosOs } = await supabase
        .from("relatorios_os")
        .select("*")
        .eq("os_id", os.id);

      if (relatoriosOs?.length) {
        for (const rel of relatoriosOs) {
          try {
            const dados = rel.dados_json as any;
            const { data: osData } = await supabase
              .from("ordens_servico")
              .select("*, uops(nome, delegacia_id, delegacias(nome, regional_id, regionais(sigla, nome))), regionais(sigla, nome)")
              .eq("id", rel.os_id)
              .single();
            const { data: custosData } = await supabase
              .from("os_custos")
              .select("descricao, tipo, valor")
              .eq("os_id", rel.os_id);
            const { data: chData } = await supabase
              .from("chamados")
              .select("codigo, tipo_demanda, local_servico, descricao, gut_gravidade, gut_urgencia, gut_tendencia, gut_score, prioridade, created_at, status")
              .eq("os_id", rel.os_id);

            const pdfDoc = generateOSReport({
              os: osData as any,
              contrato: dados.contrato || null,
              custos: (custosData || []).map((c: any) => ({ descricao: c.descricao, tipo: c.tipo, valor: Number(c.valor) })),
              responsaveis: dados.responsaveis || [],
              valorAtestado: rel.valor_atestado,
              geradoPor: dados.gerado_por_nome || "",
              historicoFluxo: dados.historicoFluxo || [],
              chamados: (chData || []).map((ch: any) => ({ ...ch, solicitante_nome: "—" })),
            }, { skipSave: true });
            const pdfBlob = pdfDoc.output("blob");
            zip.file(`relatorio_pagamento_${rel.codigo_os}.pdf`, pdfBlob);
          } catch { /* skip */ }
        }
      }

      // Relatório de Execução
      const { data: relatoriosExec } = await supabase
        .from("relatorios_execucao")
        .select("*")
        .eq("os_id", os.id);

      if (relatoriosExec?.length) {
        for (const rel of relatoriosExec) {
          try {
            const reportData = rel.dados_json as any;
            const pdfDoc = generateOSExecucaoReport(reportData);
            const pdfBlob = pdfDoc.output("blob");
            zip.file(`relatorio_execucao_${rel.codigo_os}.pdf`, pdfBlob);
          } catch { /* skip */ }
        }
      }

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `OS_${os.codigo}_documentos.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Download concluído!");
    } catch (err: any) {
      toast.error("Erro ao gerar ZIP: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return { downloadZip, downloadingId };
}
