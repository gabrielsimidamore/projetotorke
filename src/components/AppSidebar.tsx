import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Lightbulb, FileText, BarChart3, Sparkles,
  LogOut, Sun, Moon, MessageSquare, FolderKanban, ShoppingCart,
  CalendarDays, Bell, ChevronDown, ChevronRight, Plus, Wrench,
  Users, TrendingUp,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard',    url: '/',            icon: LayoutDashboard },
      { title: 'Clientes',     url: '/clientes',    icon: Users           },
      { title: 'Interações',   url: '/interacoes',  icon: MessageSquare   },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Vendas',       url: '/vendas',      icon: ShoppingCart    },
      { title: 'Reuniões',     url: '/reunioes',    icon: CalendarDays    },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { title: 'Ideias',       url: '/ideias',      icon: Lightbulb       },
      { title: 'Posts',        url: '/posts',       icon: FileText        },
    ],
  },
  {
    label: 'Análise',
    items: [
      { title: 'Métricas',     url: '/metricas',    icon: BarChart3       },
      { title: 'Recomendações',url: '/recomendacoes',icon: Sparkles       },
      { title: 'Melhorias',    url: '/melhorias',   icon: Wrench          },
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
        className="flex items-center gap-2.5 px-2.5 rounded-lg transition-all duration-150 h-8 text-[13px] text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        activeClassName="bg-primary/15 text-primary font-medium"
        activeStyle={accentColor ? { backgroundColor: accentColor + '20', color: accentColor } : undefined}
      >
        <item.icon className="w-[15px] h-[15px] shrink-0" />
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

        {/* ── Logo ── */}
        <SidebarGroup className="pb-0">
          <div className="flex items-center gap-2.5 px-3 pt-4 pb-3">
            <div className="relative shrink-0">
              <img
                src={logo}
                alt="Torke"
                className="w-8 h-8 rounded-lg object-contain border border-sidebar-border"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-semibold text-sidebar-accent-foreground truncate leading-tight text-[13px]">
                  Torke Assistem
                </p>
                {accentColor && project ? (
                  <p className="text-[11px] font-medium truncate" style={{ color: accentColor }}>
                    {project.name}
                  </p>
                ) : (
                  <p className="text-[11px] text-sidebar-muted truncate">Automações com IA</p>
                )}
              </div>
            )}
          </div>
          {accentColor && (
            <div
              className="mx-3 mb-1 h-px rounded-full opacity-60"
              style={{ backgroundColor: accentColor }}
            />
          )}
        </SidebarGroup>

        {/* ── Projetos ── */}
        <SidebarGroup className="py-0 mb-1">
          {!collapsed ? (
            <>
              <button
                onClick={() => setProjetosOpen(v => !v)}
                className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <FolderKanban className="w-3 h-3" />
                  Projetos
                </div>
                {projetosOpen
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
              </button>

              {projetosOpen && (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5 px-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/projetos"
                          className="flex items-center gap-2 px-2.5 rounded-lg h-8 text-[12px] text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all"
                          activeClassName="bg-primary/15 text-primary font-medium"
                        >
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          Ver todos
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {projetos.map(p => (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => navigate(`/projetos/${p.id}`)}
                            className="flex items-center gap-2 px-2.5 rounded-lg h-8 w-full text-left text-[12px] text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all"
                          >
                            {p.foto_url ? (
                              <img src={p.foto_url} alt={p.nome} className="w-4 h-4 rounded-full object-cover shrink-0" />
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

                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => navigate('/projetos?novo=1')}
                          className="flex items-center gap-2 px-2.5 rounded-lg h-8 w-full text-left text-[12px] text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all border border-dashed border-sidebar-border mt-0.5"
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
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/projetos"
                        className="flex items-center justify-center px-2.5 rounded-lg h-8 text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all"
                        activeClassName="bg-primary/15 text-primary"
                      >
                        <FolderKanban className="w-[15px] h-[15px]" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">Projetos</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-3 h-px bg-sidebar-border mb-1" />

        {/* ── Nav groups ── */}
        {navGroups.map(group => (
          <SidebarGroup key={group.label} className="py-0 mb-1">
            {!collapsed && (
              <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-1">
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

      {/* ── Footer ── */}
      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-0.5 bg-sidebar">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/notificacoes')}
              className="flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors text-[13px]"
            >
              <div className="relative shrink-0">
                <Bell className="w-[15px] h-[15px]" />
                {notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>Notificações</span>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="text-xs">
              Notificações{notifCount > 0 ? ` (${notifCount})` : ''}
            </TooltipContent>
          )}
        </Tooltip>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors text-[13px]"
        >
          {theme === 'light'
            ? <Moon className="w-[15px] h-[15px] shrink-0" />
            : <Sun  className="w-[15px] h-[15px] shrink-0" />
          }
          {!collapsed && (theme === 'light' ? 'Modo Escuro' : 'Modo Claro')}
        </button>

        {!collapsed && user && (
          <div className="px-2.5 py-1">
            <p className="text-[11px] text-sidebar-muted truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={signOut}
          className="flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-sidebar-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors text-[13px]"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
