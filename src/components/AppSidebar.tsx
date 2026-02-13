import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  FileText,
  LogOut,
  Shield,
  ScrollText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const allMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["gestor_nacional", "gestor_regional", "fiscal_contrato", "operador"] },
  { title: "Ordens de Serviço", url: "/ordens", icon: ClipboardList, roles: null }, // all roles
  // { title: "Manutenção Preventiva", url: "/preventiva", icon: CalendarClock }, // TODO: implementar futuramente
  { title: "Contratos", url: "/contratos", icon: FileText, roles: ["gestor_nacional", "gestor_regional", "fiscal_contrato", "operador", "preposto"] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const isAdmin = role === "gestor_nacional";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
            <Shield className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground tracking-wide">SIMP-PRF</span>
            <span className="text-xs text-sidebar-foreground/60">Manutenção Predial</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest">
            Módulos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allMenuItems
                .filter((item) => !item.roles || (role && item.roles.includes(role)))
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/gestao"}
                      tooltip="Gestão do Sistema"
                    >
                      <NavLink
                        to="/gestao"
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Gestão do Sistema</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/logs"}
                      tooltip="Logs de Auditoria"
                    >
                      <NavLink
                        to="/logs"
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <ScrollText className="h-4 w-4" />
                        <span>Logs de Auditoria</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
