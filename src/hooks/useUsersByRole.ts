import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserOption = {
  user_id: string;
  full_name: string;
  phone: string | null;
  role: string;
  email?: string;
};

/**
 * Fetch users filtered by role(s). Used to populate selects for preposto, terceirizado, etc.
 */
export function useUsersByRole(roles: string[]) {
  return useQuery({
    queryKey: ["users-by-role", roles],
    queryFn: async () => {
      // Get roles
      const { data: userRoles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", roles as any);
      if (rErr) throw rErr;
      if (!userRoles?.length) return [];

      const userIds = userRoles.map((r) => r.user_id);
      const roleMap = new Map(userRoles.map((r) => [r.user_id, r.role]));

      // Get profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds)
        .order("full_name");
      if (pErr) throw pErr;

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        role: roleMap.get(p.user_id) || "",
      })) as UserOption[];
    },
    enabled: roles.length > 0,
  });
}
