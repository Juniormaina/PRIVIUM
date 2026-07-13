import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Building2,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LogOut,
  X,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string | number;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Treasury', href: '/treasury', icon: <Wallet className="h-5 w-5" /> },
  { label: 'Payroll', href: '/payroll', icon: <DollarSign className="h-5 w-5" /> },
  { label: 'AI Assistant', href: '/ai-assistant', icon: <Bot className="h-5 w-5" /> },
  { label: 'Organization', href: '/organization', icon: <Building2 className="h-5 w-5" /> },
];

const bottomNavItems: NavItem[] = [
  { label: 'Admin', href: '/admin', icon: <Shield className="h-5 w-5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const NavItemComponent = ({ item, collapsed: isCollapsed }: { item: NavItem; collapsed: boolean }) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

    return (
      <NavLink
        to={item.href}
        onClick={onMobileClose}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
          'hover:bg-surface-800/60 hover:text-surface-100',
          isActive
            ? 'bg-privium-500/10 text-privium-400 border border-privium-500/20'
            : 'text-surface-400 border border-transparent',
          isCollapsed && 'justify-center px-2'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={cn('flex-shrink-0', isActive ? 'text-privium-400' : 'text-surface-400 group-hover:text-surface-100')}>
          {item.icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-privium-500/20 px-1.5 text-[10px] font-medium text-privium-400">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-surface-800 px-4', collapsed && 'justify-center')}>
        <div className="flex items-center gap-3">
          <img src="/privium.svg" alt="PRIVIUM" className="h-8 w-8" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-surface-100">PRIVIUM</span>
              <span className="text-[10px] text-surface-500">Enterprise Treasury</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <div className="my-3 border-t border-surface-800" />
        )}

        {bottomNavItems.map((item) => (
          <NavItemComponent key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User Section */}
      <div className={cn('border-t border-surface-800 p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar name={profile?.full_name || profile?.email || 'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">
                {profile?.full_name || profile?.email || 'User'}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {profile?.email || ''}
              </p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={signOut}
            className="rounded-lg p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'mt-2 flex items-center justify-center rounded-lg p-1.5 text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors',
            collapsed && 'w-full'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-full z-30',
          'bg-surface-950 border-r border-surface-800',
          'transition-all duration-200 ease-out',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Mobile sidebar panel */}
          <aside className="fixed left-0 top-0 h-full w-60 z-50 bg-surface-950 border-r border-surface-800 animate-in slide-in-from-left duration-200">
            <div className="flex h-16 items-center justify-between px-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <img src="/privium.svg" alt="PRIVIUM" className="h-8 w-8" />
                <span className="text-sm font-semibold text-surface-100">PRIVIUM</span>
              </div>
              <button
                onClick={onMobileClose}
                className="rounded-lg p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}