import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '../lib/database.types';

// ──────────────── Types ────────────────

export type TreasuryAccount = Tables<'treasury_accounts'>;
export type Transaction = Tables<'transactions'>;
export type ApprovalRequest = Tables<'approval_requests'>;
export type Wallet = Tables<'wallets'>;

export interface TransactionWithAccounts extends Transaction {
  source_account: Pick<TreasuryAccount, 'name' | 'type'> | null;
  destination_account: Pick<TreasuryAccount, 'name' | 'type'> | null;
  creator_profile: { full_name: string | null; email: string } | null;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  requester_profile: { full_name: string | null; email: string } | null;
  approver_profile: { full_name: string | null; email: string } | null;
  transaction?: TransactionWithAccounts | null;
}

export interface TreasuryPolicy {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number | null;
  requires_approval: boolean;
  approver_roles: string[];
  auto_approve_threshold: number;
}

export type AccountType = 'operating' | 'reserve' | 'payroll' | 'treasury';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  operating: 'Operating',
  reserve: 'Reserve',
  payroll: 'Payroll',
  treasury: 'Treasury',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, 'default' | 'success' | 'warning' | 'info' | 'outline'> = {
  operating: 'default',
  reserve: 'warning',
  payroll: 'info',
  treasury: 'success',
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  failed: 'Failed',
  declined: 'Declined',
};

export const TRANSACTION_STATUS_COLORS: Record<string, 'warning' | 'success' | 'info' | 'danger' | 'outline'> = {
  pending: 'warning',
  approved: 'info',
  completed: 'success',
  failed: 'danger',
  declined: 'danger',
};

// ──────────────── Query Keys ────────────────

export const treasuryKeys = {
  all: ['treasury'] as const,
  accounts: (orgId: string) => [...treasuryKeys.all, 'accounts', orgId] as const,
  account: (id: string) => [...treasuryKeys.all, 'account', id] as const,
  transactions: (orgId: string) => [...treasuryKeys.all, 'transactions', orgId] as const,
  approvalRequests: (orgId: string) => [...treasuryKeys.all, 'approvals', orgId] as const,
  wallets: (accountId: string) => [...treasuryKeys.all, 'wallets', accountId] as const,
};

// ──────────────── Hooks ────────────────

export function useTreasuryAccounts(orgId: string | undefined) {
  return useQuery({
    queryKey: treasuryKeys.accounts(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('treasury_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TreasuryAccount[];
    },
    enabled: !!orgId,
  });
}

export function useTreasuryAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: treasuryKeys.account(accountId ?? ''),
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from('treasury_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      return data as TreasuryAccount;
    },
    enabled: !!accountId,
  });
}

export function useTransactions(orgId: string | undefined, filters?: {
  type?: string;
  status?: string;
  accountId?: string;
  search?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...treasuryKeys.transactions(orgId ?? ''), filters],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from('transactions')
        .select('*, source_account:treasury_accounts!source_account_id(name, type), destination_account:treasury_accounts!destination_account_id(name, type), creator_profile:profiles!created_by(full_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.accountId) {
        query = query.or(`source_account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`);
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as TransactionWithAccounts[];
    },
    enabled: !!orgId,
  });
}

export function useApprovalRequests(orgId: string | undefined) {
  return useQuery({
    queryKey: treasuryKeys.approvalRequests(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*, requester_profile:profiles!requested_by(full_name, email), approver_profile:profiles!approved_by(full_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ApprovalRequestWithDetails[];
    },
    enabled: !!orgId,
  });
}

export function useAccountWallets(accountId: string | undefined) {
  return useQuery({
    queryKey: treasuryKeys.wallets(accountId ?? ''),
    queryFn: async () => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('treasury_account_id', accountId)
        .eq('is_active', true);

      if (error) throw error;
      return data as Wallet[];
    },
    enabled: !!accountId,
  });
}

// ──────────────── Mutations ────────────────

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TablesInsert<'treasury_accounts'>) => {
      const { data, error } = await supabase
        .from('treasury_accounts')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as TreasuryAccount;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: treasuryKeys.accounts(data.organization_id) });
      toast.success('Account created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create account');
    },
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      source_account_id: string;
      destination_account_id: string;
      amount: number;
      description?: string;
      created_by: string;
    }) => {
      const { data: sourceAccount } = await supabase
        .from('treasury_accounts')
        .select('balance, name')
        .eq('id', input.source_account_id)
        .single();

      if (!sourceAccount) throw new Error('Source account not found');
      if (Number(sourceAccount.balance) < input.amount) {
        throw new Error('Insufficient balance');
      }

      // Check if transfer requires approval (amount > $10,000)
      const requiresApproval = input.amount > 10000;

      // Create the transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          organization_id: input.organization_id,
          source_account_id: input.source_account_id,
          destination_account_id: input.destination_account_id,
          amount: input.amount,
          type: 'transfer',
          status: requiresApproval ? 'pending' : 'completed',
          description: input.description || null,
          created_by: input.created_by,
          completed_at: requiresApproval ? null : new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) throw txError;

      // Deduct from source account immediately
      const { error: deductError } = await supabase
        .from('treasury_accounts')
        .update({ balance: Number(sourceAccount.balance) - input.amount })
        .eq('id', input.source_account_id);

      if (deductError) throw deductError;

      // Add to destination account
      const { data: destAccount } = await supabase
        .from('treasury_accounts')
        .select('balance')
        .eq('id', input.destination_account_id)
        .single();

      if (destAccount) {
        const { error: addError } = await supabase
          .from('treasury_accounts')
          .update({ balance: Number(destAccount.balance) + input.amount })
          .eq('id', input.destination_account_id);

        if (addError) throw addError;
      }

      // If requires approval, create approval request
      if (requiresApproval) {
        const { error: approvalError } = await supabase
          .from('approval_requests')
          .insert({
            organization_id: input.organization_id,
            request_type: 'transfer',
            status: 'pending',
            requested_by: input.created_by,
            target_id: transaction.id,
            metadata: {
              amount: input.amount,
              source_account_id: input.source_account_id,
              destination_account_id: input.destination_account_id,
              source_name: sourceAccount.name,
            },
          });

        if (approvalError) throw approvalError;
      }

      return transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: treasuryKeys.transactions(data.organization_id) });
      queryClient.invalidateQueries({ queryKey: treasuryKeys.accounts(data.organization_id) });
      queryClient.invalidateQueries({ queryKey: treasuryKeys.approvalRequests(data.organization_id) });
      if (data.status === 'pending') {
        toast.success('Transfer initiated — pending approval');
      } else {
        toast.success('Transfer completed successfully');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Transfer failed');
    },
  });
}

export function useApproveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      approvedBy,
      approvalRequestId,
    }: {
      transactionId: string;
      organizationId: string;
      approvedBy: string;
      approvalRequestId: string;
    }) => {
      // Update transaction status
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (txError) throw txError;

      // Update approval request
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
        })
        .eq('id', approvalRequestId);

      if (approvalError) throw approvalError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: treasuryKeys.transactions(variables.organizationId) });
      queryClient.invalidateQueries({ queryKey: treasuryKeys.accounts(variables.organizationId) });
      queryClient.invalidateQueries({ queryKey: treasuryKeys.approvalRequests(variables.organizationId) });
      toast.success('Transfer approved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to approve transfer');
    },
  });
}

export function useDeclineTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      declinedBy,
      approvalRequestId,
    }: {
      transactionId: string;
      organizationId: string;
      declinedBy: string;
      approvalRequestId: string;
    }) => {
      // Get the transaction to find account IDs
      const { data: tx } = await supabase
        .from('transactions')
        .select('source_account_id, destination_account_id, amount')
        .eq('id', transactionId)
        .single();

      if (tx) {
        // Reverse the balance changes
        const sourceId = tx.source_account_id;
        const destId = tx.destination_account_id;

        if (sourceId) {
          const { data: sourceAccount } = await supabase
            .from('treasury_accounts')
            .select('balance')
            .eq('id', sourceId)
            .single();

          if (sourceAccount) {
            await supabase
              .from('treasury_accounts')
              .update({ balance: Number(sourceAccount.balance) + Number(tx.amount) })
              .eq('id', sourceId);
          }
        }

        if (destId) {
          const { data: destAccount } = await supabase
            .from('treasury_accounts')
            .select('balance')
            .eq('id', destId)
            .single();

          if (destAccount) {
            await supabase
              .from('treasury_accounts')
              .update({ balance: Number(destAccount.balance) - Number(tx.amount) })
              .eq('id', destId);
          }
        }
      }

      // Update transaction status
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          status: 'declined',
          approved_by: declinedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (txError) throw txError;

      // Update approval request
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .update({
          status: 'declined',
          approved_by: declinedBy,
        })
        .eq('id', approvalRequestId);

      if (approvalError) throw approvalError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: treasuryKeys.transactions(variables.organizationId) });
      queryClient.invalidateQueries({ queryKey: treasuryKeys.accounts(variables.organizationId) });
      queryClient.invalidateQueries({ queryKey: treasuryKeys.approvalRequests(variables.organizationId) });
      toast.success('Transfer declined — balances reversed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to decline transfer');
    },
  });
}

// ──────────────── CSV Export ────────────────

export function exportTransactionsToCSV(transactions: TransactionWithAccounts[]): void {
  const headers = ['Date', 'Type', 'Description', 'From', 'To', 'Amount', 'Currency', 'Status', 'Created By'];
  const rows = transactions.map((tx) => [
    new Date(tx.created_at).toISOString().split('T')[0],
    tx.type,
    tx.description || '',
    tx.source_account?.name || 'External',
    tx.destination_account?.name || 'External',
    tx.type === 'deposit' ? Number(tx.amount).toFixed(2) : -(Number(tx.amount)).toFixed(2),
    tx.currency,
    tx.status,
    tx.creator_profile?.full_name || tx.creator_profile?.email || 'Unknown',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `treasury-transactions-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Transactions exported to CSV');
}