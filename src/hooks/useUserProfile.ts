import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*, regional:regionais(id, nome, sigla)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      // Fetch all regionais for this user
      const { data: userRegionais } = await supabase
        .from("user_regionais" as any)
        .select("regional_id, regionais:regional_id(id, nome, sigla)")
        .eq("user_id", user.id);

      const regionais = (userRegionais || [])
        .map((ur: any) => ur.regionais)
        .filter(Boolean);

      return { ...data, regionais };
    },
    enabled: !!user,
  });
}
