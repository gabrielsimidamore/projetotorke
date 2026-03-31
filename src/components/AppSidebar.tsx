import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Lightbulb, FileText, BarChart3, Sparkles,
  LogOut, Sun, Moon, Users, MessageSquare, FolderKanban, ShoppingCart,
  CalendarDays, Bell, ChevronDown, ChevronRight, Plus,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, type Projeto, type Notificacao } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
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
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Notificações', url: '/notificacoes', icon: Bell },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Clientes', url: '/clientes', icon: Users },
      { title: 'Vendas', url: '/vendas', icon: ShoppingCart },
      { title: 'Interações', url: '/interacoes', icon: MessageSquare },
      { title: 'Reuniões', url: '/reunioes', icon: CalendarDays },
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
  const navigate = useNavigate();

  const [projetosOpen, setProjetosOpen] = useState(true);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    supabase
      .from('projetos')
      .select('id, nome, cor, foto_url, status')
      .order('ordem')
      .limit(12)
      .then(({ data }) => setProjetos(data ?? []));

    supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('lida', false)
      .then(({ count }) => setNotifCount(count ?? 0));
  }, []);

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

        {/* Projetos expansível */}
        <SidebarGroup className="py-0 mb-1">
          {!collapsed ? (
            <>
              <button
                onClick={() => setProjetosOpen(v => !v)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5" />
                  Projetos
                </div>
                {projetosOpen
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />}
              </button>

              {projetosOpen && (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {/* Link para lista de projetos */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/projetos"
                          className="flex items-center gap-2.5 px-2.5 rounded-md transition-all duration-150 h-8 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs">Ver todos</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Projetos individuais */}
                    {projetos.map(p => (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => navigate(`/projetos/${p.id}`)}
                            className="flex items-center gap-2 px-2.5 rounded-md transition-all duration-150 h-8 w-full text-left text-muted-foreground hover:text-foreground hover:bg-accent"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: p.cor || '#6366f1' }}
                            />
                            <span className="text-xs truncate">{p.nome}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}

                    {/* Novo projeto */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => navigate('/projetos?novo=1')}
                          className="flex items-center gap-2 px-2.5 rounded-md transition-all duration-150 h-8 w-full text-left text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs">Novo projeto</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </>
          ) : (
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to="/projetos"
                          className="flex items-center gap-2.5 px-2.5 rounded-md transition-all duration-150 h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <FolderKanban className="w-4 h-4 shrink-0" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">Projetos</TooltipContent>
                    </Tooltip>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-1 bg-sidebar">
        {/* Notificações com badge */}
        <button
          onClick={() => navigate('/notificacoes')}
          className="flex items-center gap-2 w-full px-2.5 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
        >
          <div className="relative shrink-0">
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </div>
          {!collapsed && <span className="text-xs">Notificações</span>}
        </button>

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
