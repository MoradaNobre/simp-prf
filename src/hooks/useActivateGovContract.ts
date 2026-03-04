import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GovImport = {
  id: string;
  uasg_codigo: string;
  numero: string;
  empresa: string;
  cnpj?: string | null;
  objeto?: string | null;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  valor_global?: number | null;
  situacao?: string | null;
  contrato_simp_id?: string | null;
};

type UasgMapping = Record<string, { regional_id: string; sigla: string }>;

export function useUasgRegionalMapping() {
  return useQuery({
    queryKey: ["uasg-regional-mapping"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regionais")
        .select("id, sigla, uasg_codigo")
        .not("uasg_codigo", "is", null);
      if (error) throw error;
      const mapping: UasgMapping = {};
      for (const r of data ?? []) {
        if ((r as any).uasg_codigo) {
          mapping[(r as any).uasg_codigo] = { regional_id: r.id, sigla: r.sigla };
        }
      }
      return mapping;
    },
  });
}

export function useActivateGovContract() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      govImport,
      regionalId,
    }: {
      govImport: GovImport;
      regionalId: string;
    }) => {
      // Create contract in SIMP
      const { data, error } = await supabase
        .from("contratos")
        .insert({
          numero: govImport.numero,
          empresa: govImport.empresa,
          objeto: govImport.objeto || null,
          data_inicio: govImport.vigencia_inicio || new Date().toISOString().split("T")[0],
          data_fim: govImport.vigencia_fim || new Date().toISOString().split("T")[0],
          valor_total: govImport.valor_global || 0,
          regional_id: regionalId,
          status: govImport.situacao === "Ativo" ? "vigente" : "encerrado",
          tipo_servico: "manutencao_predial",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Link back to gov import
      const { error: linkError } = await supabase
        .from("contratos_gov_import" as any)
        .update({ contrato_simp_id: data.id } as any)
        .eq("id", govImport.id);
      if (linkError) throw linkError;

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-gov-import"] });
    },
  });
}

export function useActivateGovContractsBulk() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imports,
      mapping,
    }: {
      imports: GovImport[];
      mapping: UasgMapping;
    }) => {
      let activated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const imp of imports) {
        if (imp.contrato_simp_id) {
          skipped++;
          continue;
        }
        const mapped = mapping[imp.uasg_codigo];
        if (!mapped) {
          skipped++;
          errors.push(`UASG ${imp.uasg_codigo} sem regional mapeada`);
          continue;
        }

        try {
          const { data, error } = await supabase
            .from("contratos")
            .insert({
              numero: imp.numero,
              empresa: imp.empresa,
              objeto: imp.objeto || null,
              data_inicio: imp.vigencia_inicio || new Date().toISOString().split("T")[0],
              data_fim: imp.vigencia_fim || new Date().toISOString().split("T")[0],
              valor_total: imp.valor_global || 0,
              regional_id: mapped.regional_id,
              status: imp.situacao === "Ativo" ? "vigente" : "encerrado",
              tipo_servico: "manutencao_predial",
            })
            .select("id")
            .single();

          if (error) throw error;

          await supabase
            .from("contratos_gov_import" as any)
            .update({ contrato_simp_id: data.id } as any)
            .eq("id", imp.id);

          activated++;
        } catch (err: any) {
          errors.push(`${imp.numero}: ${err.message}`);
        }
      }

      return { activated, skipped, errors };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contratos-gov-import"] });
      toast.success(
        `${result.activated} contratos ativados. ${result.skipped} ignorados.`
      );
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erros: ${result.errors.slice(0, 3).join("; ")}`);
      }
    },
    onError: (err: any) => {
      toast.error("Erro na ativação em lote: " + err.message);
    },
  });
}
