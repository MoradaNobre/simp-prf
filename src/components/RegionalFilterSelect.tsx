import { useRegionais } from "@/hooks/useHierarchy";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { isAdminRole } from "@/utils/roles";
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

  const isNacional = isAdminRole(role);
  const userRegionais: any[] = (profile as any)?.regionais || [];

  // admin roles see all; others see only their linked regionais
  const regionais = (isNacional ? allRegionais : userRegionais)
    .slice()
    .sort((a: any, b: any) => (a.sigla ?? "").localeCompare(b.sigla ?? ""));

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
