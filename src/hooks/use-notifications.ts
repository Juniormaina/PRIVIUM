import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useEffect, useCallback, useRef } from 'react';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

export type Notification = Tables<'notifications'>;
export type NotificationPreference = Tables<'notification_preferences'>;

export type NotificationType = 'transfer' | 'payroll' | 'approval' | 'invite' | 'system' | 'compliance' | 'security';

export const NOTIFICATION_TYPES: { value: NotificationType; label: string; description: string }[] = [
  { value: 'transfer', label: 'Treasury Transfers', description: 'When transfers are initiated, approved, or completed' },
  { value: 'payroll', label: 'Payroll', description: 'Payroll cycles, approvals, and disbursements' },
  { value: 'approval', label: 'Approval Requests', description: 'When something needs your approval' },
  { value: 'invite', label: 'Team Invitations', description: 'Organization invitations and member updates' },
  { value: 'compliance', label: 'Compliance', description: 'KYC/KYB status changes and updates' },
  { value: 'security', label: 'Security', description: 'Login alerts and security notifications' },
  { value: 'system', label: 'System', description: 'Platform announcements and maintenance' },
];

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  transfer: '💰',
  payroll: '📋',
  approval: '✅',
  invite: '👋',
  compliance: '🔒',
  security: '🛡️',
  system: '🔔',
};

// ──────────────── Query Keys ────────────────

export const notifKeys = {
  all: ['notifications'] as const,
  list: (orgId: string) => [...notifKeys.all, 'list', orgId] as const,
  unread: (orgId: string) => [...notifKeys.all, 'unread', orgId] as const,
  preferences: (orgId: string) => [...notifKeys.all, 'preferences', orgId] as const,
};

// ──────────────── Hooks ────────────────

export function useNotifications(orgId: string | undefined) {
  return useQuery({
    queryKey: notifKeys.list(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!orgId,
  });
}

export function useUnreadCount(orgId: string | undefined) {
  return useQuery({
    queryKey: notifKeys.unread(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('read', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
    refetchInterval: 30000, // Poll every 30s as fallback
  });
}

export function useNotificationPreferences(orgId: string | undefined) {
  return useQuery({
    queryKey: notifKeys.preferences(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as NotificationPreference[];
    },
    enabled: !!orgId,
  });
}

// ──────────────── Mutations ────────────────

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, orgId }: { notificationId: string; orgId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: notifKeys.list(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: notifKeys.unread(variables.orgId) });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: notifKeys.list(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: notifKeys.unread(variables.orgId) });
      toast.success('All notifications marked as read');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to mark all as read');
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: notifKeys.list(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: notifKeys.unread(variables.orgId) });
      toast.success('Notifications cleared');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to clear notifications');
    },
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      type,
      email,
      in_app,
    }: {
      orgId: string;
      type: NotificationType;
      email?: boolean;
      in_app?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          organization_id: orgId,
          type,
          email: email ?? true,
          in_app: in_app ?? true,
        }, { onConflict: 'user_id,organization_id,type' });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: notifKeys.preferences(variables.orgId) });
      toast.success('Preferences updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update preferences');
    },
  });
}

// ──────────────── Real-time Subscription ────────────────

export function useNotificationRealtime(
  orgId: string | undefined,
  onNewNotification?: (notification: Notification) => void
) {
  const queryClient = useQueryClient();
  const handlerRef = useRef(onNewNotification);
  handlerRef.current = onNewNotification;

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: notifKeys.list(orgId) });
          queryClient.invalidateQueries({ queryKey: notifKeys.unread(orgId) });

          // Call the callback if provided
          const newNotif = payload.new as Notification;
          if (handlerRef.current && newNotif) {
            handlerRef.current(newNotif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);
}

// ──────────────── Create Notification Utility ────────────────

export async function createNotification(input: {
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  type: NotificationType;
  resource?: string;
  resource_id?: string;
}) {
  const { error } = await supabase.from('notifications').insert(input);
  if (error) console.error('Failed to create notification:', error);
}