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
          {/* Top bar */}
          <header className="h-11 flex items-center justify-between px-4 shrink-0 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors -ml-1" />
              {project && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="text-xs font-medium" style={{ color: project.color }}>
                    {project.name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground text-xs gap-2 hidden sm:flex border border-border/60 hover:bg-accent rounded-lg"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <Search className="w-3 h-3" />
                <span>Buscar...</span>
                <kbd className="text-[10px] px-1 py-0.5 rounded bg-muted font-mono">⌘K</kbd>
              </Button>
              <Notifications />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-5 lg:p-6">
            {children}
          </main>
        </div>

        <GlobalSearch />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
