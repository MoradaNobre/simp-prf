import { useRegionais } from "@/hooks/useHierarchy";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface RegionalFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionalFilterSelect({ value, onChange }: RegionalFilterSelectProps) {
  const { data: allRegionais = [] } = useRegionais();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();

  const isNacional = role === "gestor_nacional" || role === "fiscal_contrato";
  const userRegionais: any[] = (profile as any)?.regionais || [];

  // gestor_nacional/fiscal see all; others see only their linked regionais
  const regionais = isNacional
    ? allRegionais
    : userRegionais;

  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Filtrar Regional" />
      </SelectTrigger>
      <SelectContent>
        {regionais.length > 1 && <SelectItem value="all">Todas as Regionais</SelectItem>}
        {regionais.map((r: any) => (
          <SelectItem key={r.id} value={r.id}>{r.sigla}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
