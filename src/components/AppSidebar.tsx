import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Lightbulb, FileText, BarChart3, Sparkles,
  LogOut, Sun, Moon, Users, MessageSquare, FolderKanban, ShoppingCart,
  CalendarDays, Bell, ChevronDown, ChevronRight, Plus, Network,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useProject } from '@/contexts/ProjectContext';
import { supabase, type Projeto } from '@/lib/supabase';
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
      { title: 'Insights', url: '/insights', icon: Network },
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
  const { project } = useProject();
  const navigate = useNavigate();

  const accentColor = project?.color ?? null;

  const [projetosOpen, setProjetosOpen] = useState(true);
  const [projetos, setProjetos] = useState<Pick<Projeto, 'id' | 'nome' | 'cor' | 'foto_url'>[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    supabase
      .from('projetos')
      .select('id, nome, cor, foto_url')
      .order('ordem')
      .limit(15)
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
        activeClassName={accentColor ? 'font-medium' : 'bg-primary/10 text-primary font-medium'}
        activeStyle={accentColor ? { backgroundColor: accentColor + '25', color: accentColor } : undefined}
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
      <SidebarContent
        className="bg-sidebar border-r border-sidebar-border transition-colors duration-300"
        style={accentColor ? { borderRightColor: accentColor + '60' } : undefined}
      >

        {/* Logo + project badge */}
        <SidebarGroup>
          <div className="flex items-center gap-2.5 px-3 py-4">
            <img src={logo} alt="Torke" className="w-8 h-8 rounded-lg object-contain shrink-0 border border-border" />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-semibold text-foreground truncate leading-tight text-sm">Torke Assistem</p>
                {accentColor && project ? (
                  <p className="text-xs font-medium truncate" style={{ color: accentColor }}>{project.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">CRM Autopeças</p>
                )}
              </div>
            )}
          </div>
          {/* Colored strip when inside a project */}
          {accentColor && (
            <div className="mx-3 mb-1 h-0.5 rounded-full transition-all duration-300" style={{ backgroundColor: accentColor }} />
          )}
        </SidebarGroup>

        {/* Nav groups */}
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
                    <SidebarMenuButton asChild><NavItem item={item} /></SidebarMenuButton>
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
                {projetosOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              {projetosOpen && (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {/* Ver todos */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/projetos"
                          className="flex items-center gap-2 px-2.5 rounded-md h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                          activeClassName={accentColor ? 'font-medium' : 'bg-primary/10 text-primary font-medium'}
                          activeStyle={accentColor ? { backgroundColor: accentColor + '25', color: accentColor } : undefined}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                          Ver todos
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Lista de projetos com foto */}
                    {projetos.map(p => (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => navigate(`/projetos/${p.id}`)}
                            className="flex items-center gap-2 px-2.5 rounded-md h-8 w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                          >
                            {p.foto_url ? (
                              <img
                                src={p.foto_url}
                                alt={p.nome}
                                className="w-4 h-4 rounded-full object-cover shrink-0 border border-border"
                              />
                            ) : (
                              <span
                                className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                                style={{ backgroundColor: p.cor || '#6366f1' }}
                              >
                                {p.nome.charAt(0)}
                              </span>
                            )}
                            <span className="truncate">{p.nome}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}

                    {/* Novo projeto */}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => navigate('/projetos?novo=1')}
                          className="flex items-center gap-2 px-2.5 rounded-md h-8 w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          Novo projeto
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </>
          ) : (
            /* Colapsado */
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to="/projetos"
                          className="flex items-center px-2.5 rounded-md h-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                          activeClassName={accentColor ? 'font-medium' : 'bg-primary/10 text-primary font-medium'}
                          activeStyle={accentColor ? { backgroundColor: accentColor + '25', color: accentColor } : undefined}
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

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-1 bg-sidebar">
        {/* Notificações com badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/notificacoes')}
              className="flex items-center gap-2 w-full px-2.5 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <div className="relative shrink-0">
                <Bell className="w-4 h-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="text-xs">Notificações</span>}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" className="text-xs">Notificações{notifCount > 0 ? ` (${notifCount})` : ''}</TooltipContent>}
        </Tooltip>

        <Button variant="ghost" size="sm" onClick={toggleTheme}
          className="w-full justify-start h-8 text-xs gap-2 rounded-md px-2.5 text-muted-foreground hover:text-foreground">
          {theme === 'light' ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
          {!collapsed && (theme === 'light' ? 'Modo Escuro' : 'Modo Claro')}
        </Button>

        {!collapsed && user && (
          <p className="text-[11px] px-2.5 truncate text-muted-foreground">{user.email}</p>
        )}

        <Button variant="ghost" size="sm" onClick={signOut}
          className="w-full justify-start h-8 text-xs gap-2 rounded-md px-2.5 text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
