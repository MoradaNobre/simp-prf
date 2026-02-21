import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  FileText,
  LogOut,
  Shield,
  Info,
  User,
  FileBarChart,
  DollarSign,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { isAdminRole } from "@/utils/roles";
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

const BUILD_DATE = new Date().toLocaleDateString("pt-BR");

const roleLabels: Record<string, string> = {
  gestor_master: "Gestor Master",
  gestor_nacional: "Gestor Nacional",
  gestor_regional: "Gestor Regional",
  fiscal_contrato: "Fiscal de Contrato",
  operador: "Operador",
  preposto: "Preposto",
  terceirizado: "Terceirizado",
};

const roleColors: Record<string, string> = {
  gestor_master: "purple",
  gestor_nacional: "destructive",
  gestor_regional: "default",
  fiscal_contrato: "warning",
  operador: "secondary",
  preposto: "success",
  terceirizado: "secondary",
};

const allMenuItems = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard, roles: ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato", "operador"] },
  { title: "Ordens de Serviço", url: "/app/ordens", icon: ClipboardList, roles: null }, // all roles
  // { title: "Manutenção Preventiva", url: "/app/preventiva", icon: CalendarClock }, // TODO: implementar futuramente
  { title: "Relatórios OS", url: "/app/relatorios", icon: FileBarChart, roles: ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato", "preposto", "terceirizado"] },
  { title: "Contratos", url: "/app/contratos", icon: FileText, roles: ["gestor_master", "gestor_nacional", "gestor_regional", "fiscal_contrato", "operador", "preposto"] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const { data: profile } = useUserProfile();
  const isAdmin = isAdminRole(role);
  const isRegional = role === "gestor_regional";
  const canManage = isAdmin || isRegional;

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
            <span className="text-[10px] text-sidebar-foreground/40">Build {BUILD_DATE}</span>
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
                      activeClassName="bg-sidebar-accent text-yellow-400 font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {canManage && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/app/orcamento"}
                      tooltip="Gestão do Orçamento"
                    >
                      <NavLink
                        to="/app/orcamento"
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-yellow-400 font-medium"
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>Gestão do Orçamento</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === "/app/gestao"}
                      tooltip="Gestão do Sistema"
                    >
                      <NavLink
                        to="/app/gestao"
                        end
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-yellow-400 font-medium"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Gestão do Sistema</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-3">
        {profile && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
              <User className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name || "Sem nome"}
              </span>
              {role && (
                <Badge variant={(roleColors[role] || "secondary") as any} className="text-[10px] w-fit px-1.5 py-0">
                  {roleLabels[role] || role}
                </Badge>
              )}
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/app/sobre"}
              tooltip="Sobre o Sistema"
            >
              <NavLink
                to="/app/sobre"
                end
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-yellow-400 font-medium"
              >
                <Info className="h-4 w-4" />
                <span>Sobre</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
