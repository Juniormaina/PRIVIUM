import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Tables } from '../lib/database.types';

export type AuditLog = Tables<'audit_logs'>;

export interface AuditLogWithProfile extends AuditLog {
  profile: {
    full_name: string | null;
    email: string;
  } | null;
}

export interface AuditLogFilters {
  action?: string;
  resource?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ──────────────── Query Keys ────────────────

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (orgId: string, filters?: AuditLogFilters) => [...auditKeys.all, 'list', orgId, filters] as const,
};

// ──────────────── Hooks ────────────────

export function useAuditLogs(orgId: string | undefined, filters?: AuditLogFilters) {
  return useQuery({
    queryKey: auditKeys.list(orgId ?? '', filters),
    queryFn: async () => {
      if (!orgId) return [];

      let query = supabase
        .from('audit_logs')
        .select('*, profile:profiles(full_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.resource) {
        query = query.eq('resource', filters.resource);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.search) {
        query = query.or(
          `action.ilike.%${filters.search}%,resource.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as AuditLogWithProfile[];
    },
    enabled: !!orgId,
  });
}

export function useExportAuditLogs(orgId: string | undefined) {
  return useMutation({
    mutationFn: async (filters?: AuditLogFilters) => {
      if (!orgId) throw new Error('No organization selected');

      let query = supabase
        .from('audit_logs')
        .select('*, profile:profiles(full_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (filters?.action) query = query.eq('action', filters.action);
      if (filters?.resource) query = query.eq('resource', filters.resource);
      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;

      const logs = data as unknown as AuditLogWithProfile[];
      return generateAuditLogCSV(logs);
    },
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit log exported');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to export audit log');
    },
  });
}

function generateAuditLogCSV(logs: AuditLogWithProfile[]): string {
  const headers = ['Date', 'User', 'Email', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Metadata'];
  const rows = logs.map((log) => [
    new Date(log.created_at).toISOString(),
    log.profile?.full_name || 'Unknown',
    log.profile?.email || '',
    log.action,
    log.resource,
    log.resource_id,
    log.ip_address,
    JSON.stringify(log.metadata),
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}

// ──────────────── Resource Types ────────────────

export const AUDIT_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'approved',
  'declined',
  'submitted',
  'completed',
  'cancelled',
  'invited',
  'removed',
  'signed_in',
  'signed_out',
  'exported',
  'viewed',
] as const;

export const AUDIT_RESOURCES = [
  'organization',
  'treasury_account',
  'transaction',
  'payroll_cycle',
  'payroll_employee',
  'department',
  'invitation',
  'member',
  'settings',
  'api_key',
  'policy',
] as const;

export const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  approved: 'Approved',
  declined: 'Declined',
  submitted: 'Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  invited: 'Invited',
  removed: 'Removed',
  signed_in: 'Signed In',
  signed_out: 'Signed Out',
  exported: 'Exported',
  viewed: 'Viewed',
};

export const RESOURCE_LABELS: Record<string, string> = {
  organization: 'Organization',
  treasury_account: 'Treasury Account',
  transaction: 'Transaction',
  payroll_cycle: 'Payroll Cycle',
  payroll_employee: 'Employee',
  department: 'Department',
  invitation: 'Invitation',
  member: 'Member',
  settings: 'Settings',
  api_key: 'API Key',
  policy: 'Policy',
};