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

const navGroups = [
  {
    label: 'Workspace',
    items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Clientes',   url: '/clientes',   icon: Users },
      { title: 'Interações', url: '/interacoes', icon: MessageSquare },
      { title: 'Projetos',   url: '/projetos',   icon: FolderKanban },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { title: 'Ideias', url: '/ideias', icon: Lightbulb },
      { title: 'Posts',  url: '/posts',  icon: FileText },
    ],
  },
  {
    label: 'Análise',
    items: [
      { title: 'Métricas',      url: '/metricas',      icon: BarChart3 },
      { title: 'Recomendações', url: '/recomendacoes', icon: Sparkles },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <SidebarGroup>
          <div className="flex items-center gap-2.5 px-3 py-4">
            <img
              src={logo}
              alt="Torke"
              className="w-7 h-7 rounded-lg object-contain shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-bold text-white/90 truncate leading-tight" style={{ fontSize: 13 }}>Torke Assistem</p>
                <p className="text-white/35 truncate" style={{ fontSize: 10 }}>CRM Autopeças</p>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Nav groups */}
        {navGroups.map(group => (
          <SidebarGroup key={group.label} className="py-0 mb-1">
            {!collapsed && (
              <SidebarGroupLabel
                className="px-3 py-1.5 mb-0"
                style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)' }}
              >
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-2 px-2.5 rounded-lg transition-all duration-150 h-8"
                        style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: 500 }}
                        activeStyle={{ background: 'rgba(245,197,24,0.1)', color: '#F5C518', borderLeft: '2px solid #F5C518', paddingLeft: 9 }}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter
        className="border-t p-2 space-y-1"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
      >
        <Button
          variant="ghost" size="sm" onClick={toggleTheme}
          className="w-full justify-start h-7 text-xs gap-2 rounded-lg px-2.5"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5 shrink-0" /> : <Sun className="w-3.5 h-3.5 shrink-0" />}
          {!collapsed && (theme === 'light' ? 'Modo Escuro' : 'Modo Claro')}
        </Button>
        {!collapsed && user && (
          <p className="text-[10px] px-2.5 truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>{user.email}</p>
        )}
        <Button
          variant="ghost" size="sm" onClick={signOut}
          className="w-full justify-start h-7 text-xs gap-2 rounded-lg px-2.5"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
