import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Notifications } from '@/components/Notifications';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs gap-2 hidden sm:flex"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <Search className="w-3.5 h-3.5" />
                Buscar...
                <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
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
