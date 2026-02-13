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
  const userRegionalIds: string[] = (profile as any)?.regionais?.map((r: any) => r.id) ?? [];

  // The effective regional_id to filter by
  const effectiveRegionalId = useMemo(() => {
    if (isNacional) {
      return selectedRegionalId || null; // null = show all
    }
    // For non-national users, use selectedRegionalId if it's in their regionais, else first
    if (selectedRegionalId && userRegionalIds.includes(selectedRegionalId)) {
      return selectedRegionalId;
    }
    return userRegionalIds[0] || null;
  }, [isNacional, selectedRegionalId, userRegionalIds]);

  return {
    isNacional,
    effectiveRegionalId,
    userRegionalIds,
    selectedRegionalId,
    setSelectedRegionalId,
  };
}
