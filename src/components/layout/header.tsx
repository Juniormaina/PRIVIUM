import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { useTheme } from '../../providers/theme-provider';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-surface-800 bg-surface-950/80 backdrop-blur-md px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <div className="flex-1">
        {title && (
          <h1 className="text-lg font-semibold text-surface-100">{title}</h1>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div ref={notifMenuRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-lg p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-accent" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-surface-800 bg-surface-900 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
                <span className="text-sm font-medium text-surface-200">Notifications</span>
                <button className="text-xs text-privium-400 hover:text-privium-300 transition-colors">
                  Mark all read
                </button>
              </div>
              <div className="p-4 text-center text-sm text-surface-500">
                <p>No new notifications</p>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface-800 transition-colors"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            <Avatar name={profile?.full_name || profile?.email || 'User'} size="sm" />
            <span className="hidden md:block text-sm font-medium text-surface-200">
              {profile?.full_name || profile?.email || 'User'}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-surface-400 transition-transform duration-150', userMenuOpen && 'rotate-180')} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-surface-800 bg-surface-900 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-surface-800">
                <p className="text-sm font-medium text-surface-200">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-surface-500">{profile?.email}</p>
              </div>
              <div className="p-1">
                <Link
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => { setUserMenuOpen(false); signOut(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}