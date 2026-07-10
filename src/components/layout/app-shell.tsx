import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <Sidebar
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col lg:pl-60">
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          title={title}
        />

        <main className="flex-1 overflow-y-auto bg-surface-100 dark:bg-surface-900">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}