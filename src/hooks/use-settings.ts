import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../providers/auth-provider';
import type { TablesUpdate } from '../lib/database.types';

// ──────────────── Profile Update ────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async (input: { full_name?: string; avatar_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: input.full_name,
          avatar_url: input.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update profile');
    },
  });
}

// ──────────────── Password Change ────────────────

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: input.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: input.newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to change password');
    },
  });
}

// ──────────────── Organization Settings ────────────────

export function useUpdateOrgSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orgId: string;
      name?: string;
      slug?: string;
      logo_url?: string | null;
      settings?: Record<string, unknown>;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.slug !== undefined) updates.slug = input.slug;
      if (input.logo_url !== undefined) updates.logo_url = input.logo_url;
      if (input.settings !== undefined) updates.settings = input.settings;

      const { error } = await supabase
        .from('organizations')
        .update(updates as TablesUpdate<'organizations'>)
        .eq('id', input.orgId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'detail', variables.orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations', 'list'] });
      toast.success('Organization settings updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update organization');
    },
  });
}