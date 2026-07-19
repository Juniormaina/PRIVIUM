import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { useTheme } from '../../providers/theme-provider';
import { useOrganization } from '../../providers/organization-provider';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useNotificationRealtime,
  type Notification,
} from '../../hooks/use-notifications';
import { formatRelativeTime } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Menu,
  Bell,
  BellOff,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  ChevronDown,
  CheckCheck,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

const NOTIF_EMOJI: Record<string, string> = {
  transfer: '💰',
  payroll: '📋',
  approval: '✅',
  invite: '👋',
  compliance: '🔒',
  security: '🛡️',
  system: '🔔',
};

export function Header({ onMenuClick, title }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentOrgId } = useOrganization();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications(currentOrgId ?? undefined);
  const { data: unreadCount = 0, refetch: refetchUnread } = useUnreadCount(currentOrgId ?? undefined);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Real-time notification subscription
  const handleNewNotification = useCallback((notification: Notification) => {
    refetchUnread();
    // Show a toast for new notifications
    const emoji = NOTIF_EMOJI[notification.type] || '🔔';
    toast(
      <div className="flex items-start gap-3">
        <span className="text-lg">{emoji}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
        </div>
      </div>,
      {
        duration: 5000,
        position: 'top-right',
      }
    );
  }, [refetchUnread]);

  useNotificationRealtime(currentOrgId ?? undefined, handleNewNotification);

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

  // Close notification dropdown on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleMarkAsRead = useCallback((notifId: string) => {
    if (!currentOrgId) return;
    markAsRead.mutate({ notificationId: notifId, orgId: currentOrgId });
  }, [markAsRead, currentOrgId]);

  const handleMarkAllRead = useCallback(() => {
    // Use the profile's id as the user_id
    if (!profile?.id || !currentOrgId) return;
    markAllAsRead.mutate({ orgId: currentOrgId, userId: profile.id });
  }, [markAllAsRead, currentOrgId, profile?.id]);

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
        {/* Keyboard shortcut hint */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-surface-800/50 text-[10px] text-surface-500">
          <kbd className="font-mono">⌘K</kbd>
          <span>Commands</span>
        </div>

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
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-surface-800 bg-surface-900 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
              role="dialog"
              aria-label="Notifications"
            >
              <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
                <span className="text-sm font-medium text-surface-200">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({unreadCount} unread)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-privium-400 hover:text-privium-300 hover:bg-surface-800 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <BellOff className="h-8 w-8 text-surface-600 mb-2" />
                    <p className="text-sm text-surface-500">No notifications yet</p>
                    <p className="text-xs text-surface-600 mt-1">
                      Notifications will appear here
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((notif) => {
                    const emoji = NOTIF_EMOJI[notif.type] || '🔔';
                    return (
                      <button
                        key={notif.id}
                        onClick={() => {
                          if (!notif.read) {
                            handleMarkAsRead(notif.id);
                          }
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                          'hover:bg-surface-800/50',
                          !notif.read && 'bg-privium-500/5 border-l-2 border-privium-500'
                        )}
                      >
                        <span className="text-lg flex-shrink-0 mt-0.5">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm',
                            notif.read ? 'text-surface-400' : 'text-surface-200 font-medium'
                          )}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-surface-600 mt-1">
                            {formatRelativeTime(notif.created_at)}
                          </p>
                        </div>
                        {!notif.read && (
                          <span className="flex-shrink-0 mt-2 flex h-2 w-2 rounded-full bg-privium-400" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-surface-800 px-4 py-2">
                  <Link
                    to="/settings"
                    onClick={() => setNotificationsOpen(false)}
                    className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-privium-400 hover:text-privium-300 hover:bg-surface-800 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Notification settings
                  </Link>
                </div>
              )}
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

