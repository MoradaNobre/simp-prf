import { useRegionais } from "@/hooks/useHierarchy";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface RegionalFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionalFilterSelect({ value, onChange }: RegionalFilterSelectProps) {
  const { data: regionais = [] } = useRegionais();

  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Filtrar Regional" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as Regionais</SelectItem>
        {regionais.map((r) => (
          <SelectItem key={r.id} value={r.id}>{r.sigla}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
