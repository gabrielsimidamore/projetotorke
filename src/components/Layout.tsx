import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Notifications } from '@/components/Notifications';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps { children: React.ReactNode; }

const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header
            className="h-11 flex items-center justify-between px-4 shrink-0"
            style={{
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <SidebarTrigger className="text-white/40 hover:text-white/70 transition-colors" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-white/35 text-xs gap-2 hidden sm:flex hover:text-white/60 hover:bg-white/5 rounded-lg px-3"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <Search className="w-3 h-3" />
                <span>Buscar...</span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>⌘K</kbd>
              </Button>
              <Notifications />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-5">
            {children}
          </main>
        </div>
        <GlobalSearch />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
