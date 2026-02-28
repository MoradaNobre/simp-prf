import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, HelpCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TermosPrivacidadeDialog } from "@/components/TermosPrivacidadeDialog";

export function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-password-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password, ativo, accepted_terms_at")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const needsTerms = !!profile && !(profile as any).accepted_terms_at;

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.must_change_password) {
    return <Navigate to="/alterar-senha" replace />;
  }

  if (profile && !(profile as any).ativo) {
    signOut();
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {needsTerms && user && (
        <TermosPrivacidadeDialog
          open={needsTerms}
          userId={user.id}
          onAccepted={() => {
            queryClient.invalidateQueries({ queryKey: ["profile-password-check", user.id] });
          }}
        />
      )}
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.email}
                </span>
                <ThemeToggle />
                <Button variant="ghost" size="icon" onClick={() => navigate("/app/manual")} title="Ajuda">
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <div className="flex-1 p-3 sm:p-6 overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}
