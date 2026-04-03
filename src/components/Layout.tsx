import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Notifications } from '@/components/Notifications';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/ProjectContext';

interface LayoutProps { children: React.ReactNode; }

const Layout = ({ children }: LayoutProps) => {
  const { project } = useProject();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-12 flex items-center justify-between px-4 shrink-0 border-b transition-colors duration-300"
            style={project
              ? { borderBottomColor: project.color + '55', backgroundColor: project.color + '12' }
              : undefined}
          >
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              {project && (
                <span className="text-xs font-semibold" style={{ color: project.color }}>
                  {project.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-muted-foreground text-xs gap-2 hidden sm:flex"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar...</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted">⌘K</kbd>
              </Button>
              <Notifications />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
        <GlobalSearch />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
