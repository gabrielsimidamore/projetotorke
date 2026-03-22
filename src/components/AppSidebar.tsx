import {
  LayoutDashboard, Lightbulb, FileText, BarChart3, Sparkles,
  LogOut, Sun, Moon, Users, MessageSquare, FolderKanban,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import logo from '@/assets/logo-torke.jpeg';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navGroups = [
  {
    label: 'Workspace',
    items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Clientes', url: '/clientes', icon: Users },
      { title: 'Interações', url: '/interacoes', icon: MessageSquare },
      { title: 'Projetos', url: '/projetos', icon: FolderKanban },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { title: 'Ideias', url: '/ideias', icon: Lightbulb },
      { title: 'Posts', url: '/posts', icon: FileText },
    ],
  },
  {
    label: 'Análise',
    items: [
      { title: 'Métricas', url: '/metricas', icon: BarChart3 },
      { title: 'Recomendações', url: '/recomendacoes', icon: Sparkles },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const NavItem = ({ item }: { item: typeof navGroups[0]['items'][0] }) => {
    const link = (
      <NavLink
        to={item.url}
        end={item.url === '/'}
        className="flex items-center gap-2.5 px-2.5 rounded-md transition-all duration-150 h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
        activeClassName="bg-primary/10 text-primary font-medium"
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <SidebarGroup>
          <div className="flex items-center gap-2.5 px-3 py-4">
            <img src={logo} alt="Torke" className="w-8 h-8 rounded-lg object-contain shrink-0 border border-border" />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-semibold text-foreground truncate leading-tight text-sm">Torke Assistem</p>
                <p className="text-xs text-muted-foreground truncate">CRM Autopeças</p>
              </div>
            )}
          </div>
        </SidebarGroup>

        {navGroups.map(group => (
          <SidebarGroup key={group.label} className="py-0 mb-1">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 py-1.5 mb-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavItem item={item} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-1 bg-sidebar">
        <Button
          variant="ghost" size="sm" onClick={toggleTheme}
          className="w-full justify-start h-8 text-xs gap-2 rounded-md px-2.5 text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
          {!collapsed && (theme === 'light' ? 'Modo Escuro' : 'Modo Claro')}
        </Button>
        {!collapsed && user && (
          <p className="text-[11px] px-2.5 truncate text-muted-foreground">{user.email}</p>
        )}
        <Button
          variant="ghost" size="sm" onClick={signOut}
          className="w-full justify-start h-8 text-xs gap-2 rounded-md px-2.5 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
