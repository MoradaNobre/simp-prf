import { useState, useMemo } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Provides regional filtering based on user role:
 * - gestor_nacional: can filter by any regional (optional)
 * - others: locked to their own regionais (first one used as default)
 */
export function useRegionalFilter() {
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const [selectedRegionalId, setSelectedRegionalId] = useState<string>("");

  const isNacional = role === "gestor_nacional";
  const isFiscal = role === "fiscal_contrato";
  const userRegionalIds: string[] = (profile as any)?.regionais?.map((r: any) => r.id) ?? [];
  const hasMultipleRegionais = userRegionalIds.length > 1;
  const canFilterRegional = isNacional || isFiscal || hasMultipleRegionais;

  // The effective regional_id to filter by
  const effectiveRegionalId = useMemo(() => {
    if (canFilterRegional) {
      return selectedRegionalId || null; // null = show all
    }
    return userRegionalIds[0] || null;
  }, [canFilterRegional, selectedRegionalId, userRegionalIds]);

  return {
    isNacional,
    canFilterRegional,
    effectiveRegionalId,
    userRegionalIds,
    selectedRegionalId,
    setSelectedRegionalId,
  };
}
