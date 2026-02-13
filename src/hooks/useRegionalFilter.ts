import { useState, useMemo } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Provides regional filtering based on user role:
 * - gestor_nacional: can filter by any regional (optional)
 * - gestor_regional: locked to their own regional
 * - others: locked to their own regional
 */
export function useRegionalFilter() {
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const [selectedRegionalId, setSelectedRegionalId] = useState<string>("");

  const isNacional = role === "gestor_nacional";
  const userRegionalId = profile?.regional_id ?? null;

  // The effective regional_id to filter by
  const effectiveRegionalId = useMemo(() => {
    if (isNacional) {
      return selectedRegionalId || null; // null = show all
    }
    return userRegionalId; // locked to user's regional
  }, [isNacional, selectedRegionalId, userRegionalId]);

  return {
    isNacional,
    effectiveRegionalId,
    selectedRegionalId,
    setSelectedRegionalId,
  };
}
