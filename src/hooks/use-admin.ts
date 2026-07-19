import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Tables } from '../lib/database.types';

export type Organization = Tables<'organizations'>;
export type Profile = Tables<'profiles'>;
export type OrganizationMember = Tables<'organization_members'>;

export interface AdminUserWithOrgs extends Profile {
  organizations: { organization_id: string; role: string; organization_name: string }[];
}

export interface SystemHealth {
  apiStatus: 'operational' | 'degraded' | 'down';
  databaseStatus: 'healthy' | 'degraded' | 'down';
  blockchainStatus: 'synced' | 'syncing' | 'error';
  authStatus: 'operational' | 'degraded' | 'down';
  uptime: number;
  lastChecked: string;
}

export interface PlatformMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalTransactions: number;
  totalPayrollCycles: number;
  totalVolume: number;
  pendingApprovals: number;
  growthRate: number;
}

// ──────────────── Query Keys ────────────────

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  organizations: () => [...adminKeys.all, 'organizations'] as const,
  health: () => [...adminKeys.all, 'health'] as const,
  metrics: () => [...adminKeys.all, 'metrics'] as const,
};

// ──────────────── Hooks ────────────────

export function useAdminOrganizations() {
  return useQuery({
    queryKey: adminKeys.organizations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Organization[];
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (profilesError) throw profilesError;

      // Get all memberships for these users
      const userIds = (profiles || []).map((p) => p.id);
      if (userIds.length === 0) return [];

      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select('*, organizations(name)')
        .in('user_id', userIds);

      if (membershipsError) throw membershipsError;

      // Combine into user objects
      const usersWithOrgs = (profiles || []).map((profile) => {
        const userOrgs = (memberships || [])
          .filter((m) => m.user_id === profile.id)
          .map((m) => ({
            organization_id: m.organization_id,
            role: m.role,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            organization_name: (m as any).organizations?.name || 'Unknown',
          }));

        return {
          ...profile,
          organizations: userOrgs,
        } as AdminUserWithOrgs;
      });

      return usersWithOrgs;
    },
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: async () => {
      // Simulate health check — in production, this would ping actual services
      const health: SystemHealth = {
        apiStatus: 'operational',
        databaseStatus: 'healthy',
        blockchainStatus: 'synced',
        authStatus: 'operational',
        uptime: 99.97,
        lastChecked: new Date().toISOString(),
      };

      // Check database connectivity
      try {
        const { error } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
        if (error) {
          health.databaseStatus = 'degraded';
        }
      } catch {
        health.databaseStatus = 'down';
      }

      // Check auth
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          health.authStatus = 'degraded';
        }
      } catch {
        health.authStatus = 'down';
      }

      return health;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function usePlatformMetrics() {
  return useQuery({
    queryKey: adminKeys.metrics(),
    queryFn: async () => {
      const [orgsResult, membersResult, txResult, payrollResult, approvalsResult, profilesResult] =
        await Promise.allSettled([
          supabase.from('organizations').select('id, is_active'),
          supabase.from('organization_members').select('id', { count: 'exact', head: true }),
          supabase.from('transactions').select('amount'),
          supabase.from('payroll_cycles').select('id', { count: 'exact', head: true }),
          supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
        ]);

      const allOrgs = orgsResult.status === 'fulfilled' ? (orgsResult.value.data as Organization[]) || [] : [];
      const allTx = txResult.status === 'fulfilled' ? (txResult.value.data as { amount: number }[]) || [] : [];
      const totalPayroll = payrollResult.status === 'fulfilled' ? payrollResult.value.count ?? 0 : 0;
      const pendingApprovals = approvalsResult.status === 'fulfilled' ? approvalsResult.value.count ?? 0 : 0;
      const totalUsers = profilesResult.status === 'fulfilled' ? profilesResult.value.count ?? 0 : 0;

      const totalVolume = allTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      return {
        totalOrganizations: allOrgs.length,
        activeOrganizations: allOrgs.filter((o) => o.is_active).length,
        totalUsers,
        totalTransactions: allTx.length,
        totalPayrollCycles: totalPayroll,
        totalVolume,
        pendingApprovals,
        growthRate: 12.5, // This would come from period-over-period comparison
      } as PlatformMetrics;
    },
  });
}

// ──────────────── Mutations ────────────────

export function useToggleOrganizationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, isActive }: { orgId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: isActive })
        .eq('id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.organizations() });
      queryClient.invalidateQueries({ queryKey: adminKeys.metrics() });
      toast.success('Organization status updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update organization');
    },
  });
}