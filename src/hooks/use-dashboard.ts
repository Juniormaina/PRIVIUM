import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tables } from '../lib/database.types';

// ──────────────── Types ────────────────

export type TreasuryAccount = Tables<'treasury_accounts'>;
export type Transaction = Tables<'transactions'>;
export type PayrollCycle = Tables<'payroll_cycles'>;
export type PayrollEmployee = Tables<'payroll_employees'>;

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
  label: string;
}

export interface TransactionVolumePoint {
  date: string;
  transfers: number;
  payments: number;
  deposits: number;
  withdrawals: number;
  total: number;
}

export interface AccountDistributionItem {
  name: string;
  value: number;
  color: string;
  type: string;
}

export interface PayrollByDeptItem {
  department: string;
  amount: number;
  employeeCount: number;
}

export interface PayrollTrendPoint {
  month: string;
  total: number;
  cycleCount: number;
}

export interface ExecutiveStats {
  totalBalance: number;
  balanceChange: number;
  balanceChangePercent: number;
  monthlyPayroll: number;
  payrollChange: number;
  activeEmployees: number;
  employeeChange: number;
  pendingApprovals: number;
  memberCount: number;
}

export interface DashboardData {
  executive: ExecutiveStats;
  balanceHistory: BalanceHistoryPoint[];
  transactionVolume: TransactionVolumePoint[];
  accountDistribution: AccountDistributionItem[];
  payrollByDepartment: PayrollByDeptItem[];
  payrollTrends: PayrollTrendPoint[];
  recentTransactions: (Transaction & {
    source_account: { name: string; type: string } | null;
    destination_account: { name: string; type: string } | null;
  })[];
  activePayrollCycles: number;
  pendingApprovalAmount: number;
  totalPayrollQuarter: number;
  averageSalary: number;
}

// ──────────────── Query Keys ────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (orgId: string) => [...dashboardKeys.all, 'stats', orgId] as const,
  balanceHistory: (orgId: string, days: number) => [...dashboardKeys.all, 'balance-history', orgId, days] as const,
  transactionVolume: (orgId: string, days: number) => [...dashboardKeys.all, 'tx-volume', orgId, days] as const,
  accountDistribution: (orgId: string) => [...dashboardKeys.all, 'account-dist', orgId] as const,
  payrollByDept: (orgId: string) => [...dashboardKeys.all, 'payroll-dept', orgId] as const,
  payrollTrends: (orgId: string, months: number) => [...dashboardKeys.all, 'payroll-trends', orgId, months] as const,
  allData: (orgId: string, days: number) => [...dashboardKeys.all, 'all', orgId, days] as const,
};

// ──────────────── Helpers ────────────────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDaysArray(days: number): { date: string; label: string }[] {
  const result: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Yesterday'
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    result.push({ date: formatDate(d), label });
  }
  return result;
}

function getMonthsArray(months: number): { start: string; label: string }[] {
  const result: { start: string; label: string }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    result.push({ start: formatDate(d), label });
  }
  return result;
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  operating: '#6366f1',
  reserve: '#f59e0b',
  payroll: '#10b981',
  treasury: '#3b82f6',
};

// ──────────────── Hooks ────────────────

export function useDashboardData(orgId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: dashboardKeys.allData(orgId ?? '', days),
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID required');

      const now = new Date();
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - days);

      // ── Parallel data fetching ──
      const [
        accountsResult,
        transactionsResult,
        employeesResult,
        cyclesResult,
        membersResult,
        approvalsResult,
        departmentsResult,
      ] = await Promise.all([
        // All treasury accounts
        supabase
          .from('treasury_accounts')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true),

        // Recent transactions
        supabase
          .from('transactions')
          .select('*, source_account:treasury_accounts!source_account_id(name, type), destination_account:treasury_accounts!destination_account_id(name, type)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100),

        // Active employees
        supabase
          .from('payroll_employees')
          .select('*')
          .eq('organization_id', orgId)
          .eq('status', 'active'),

        // Payroll cycles
        supabase
          .from('payroll_cycles')
          .select('*')
          .eq('organization_id', orgId)
          .order('period_start', { ascending: false })
          .limit(50),

        // Member count
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_active', true),

        // Pending approvals
        supabase
          .from('approval_requests')
          .select('*')
          .eq('organization_id', orgId)
          .eq('status', 'pending'),

        // Departments
        supabase
          .from('departments')
          .select('*')
          .eq('organization_id', orgId),
      ]);

      const accounts = (accountsResult.data || []) as TreasuryAccount[];
      const transactions = (transactionsResult.data || []) as (Transaction & {
        source_account: { name: string; type: string } | null;
        destination_account: { name: string; type: string } | null;
      })[];
      const employees = (employeesResult.data || []) as PayrollEmployee[];
      const cycles = (cyclesResult.data || []) as PayrollCycle[];
      const memberCount = membersResult.count || 0;
      const pendingApprovals = (approvalsResult.data || []) as Tables<'approval_requests'>[];
      const departments = (departmentsResult.data || []) as Tables<'departments'>[];

      // ── Executive Stats ──
      const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

      // Balance change (compare last 30 days of transactions)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTransactions = transactions.filter(
        (tx) => new Date(tx.created_at) >= thirtyDaysAgo && tx.status === 'completed'
      );
      const netChange = recentTransactions.reduce((sum, tx) => {
        if (tx.type === 'deposit') return sum + Number(tx.amount);
        if (tx.type === 'withdrawal') return sum - Number(tx.amount);
        if (tx.type === 'transfer') return sum; // internal, no net change
        if (tx.type === 'payment') return sum - Number(tx.amount);
        return sum;
      }, 0);
      const balanceChangePercent = totalBalance > 0 ? (netChange / totalBalance) * 100 : 0;

      // Monthly payroll (latest completed cycle)
      const completedCycles = cycles.filter((c) => c.status === 'completed');
      const latestCompleted = completedCycles[0];
      const monthlyPayroll = latestCompleted ? Number(latestCompleted.total_amount) : 0;

      // Payroll change (compare to previous cycle)
      const payrollChange = completedCycles.length >= 2
        ? Number(completedCycles[0].total_amount) - Number(completedCycles[1].total_amount)
        : 0;

      // Active employees
      const activeEmployees = employees.length;

      // Employee change (compare to count from cycles with employees)
      const employeeChange = 0; // Placeholder — would need historical snapshots

      // Pending approval count
      const pendingApprovalCount = pendingApprovals.length;

      // Active payroll cycles
      const activeCycles = cycles.filter(
        (c) => !['completed', 'draft'].includes(c.status)
      );
      const activePayrollCycles = activeCycles.length;

      // Pending approval amount
      const pendingApprovalAmount = pendingApprovals
        .filter((a) => a.request_type === 'transfer' || a.request_type === 'payroll')
        .reduce((sum, a) => {
          const meta = a.metadata as { amount?: number } | null;
          return sum + (meta?.amount || 0);
        }, 0);

      // Quarter total
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterCycles = cycles.filter(
        (c) => c.status === 'completed' && new Date(c.period_start) >= quarterStart
      );
      const totalPayrollQuarter = quarterCycles.reduce((sum, c) => sum + Number(c.total_amount), 0);

      // Average salary
      const averageSalary = activeEmployees > 0
        ? employees.reduce((sum, e) => sum + Number(e.salary), 0) / activeEmployees
        : 0;

      // ── Balance History ──
      const daysList = getDaysArray(days);
      let runningBalance = totalBalance;
      const balanceHistory: BalanceHistoryPoint[] = daysList.map((d) => {
        // Find transactions on this day to adjust running balance
        const dayTxs = recentTransactions.filter(
          (tx) => formatDate(new Date(tx.created_at)) === d.date
        );
        const dayNet = dayTxs.reduce((sum, tx) => {
          if (tx.type === 'deposit') return sum + Number(tx.amount);
          if (tx.type === 'payment' || tx.type === 'withdrawal') return sum - Number(tx.amount);
          return sum;
        }, 0);
        // We're going backwards, so add back the net change
        runningBalance -= dayNet;
        return {
          date: d.date,
          balance: Math.max(0, runningBalance),
          label: d.label,
        };
      });

      // ── Transaction Volume ──
      const volumeByDate = new Map<string, { transfers: number; payments: number; deposits: number; withdrawals: number }>();
      daysList.forEach((d) => {
        volumeByDate.set(d.date, { transfers: 0, payments: 0, deposits: 0, withdrawals: 0 });
      });
      recentTransactions.forEach((tx) => {
        const dateKey = formatDate(new Date(tx.created_at));
        const entry = volumeByDate.get(dateKey);
        if (entry) {
          const type = tx.type as keyof typeof entry;
          if (type in entry) {
            entry[type] += Number(tx.amount);
          }
        }
      });
      const transactionVolume: TransactionVolumePoint[] = daysList.map((d) => {
        const v = volumeByDate.get(d.date) || { transfers: 0, payments: 0, deposits: 0, withdrawals: 0 };
        return {
          date: d.date,
          ...v,
          total: v.transfers + v.payments + v.deposits + v.withdrawals,
        };
      });

      // ── Account Distribution ──
      const accountDistribution: AccountDistributionItem[] = accounts.map((a) => ({
        name: a.name,
        value: Number(a.balance),
        color: ACCOUNT_TYPE_COLORS[a.type] || '#64748b',
        type: a.type,
      }));

      // ── Payroll by Department ──
      const deptMap = new Map<string, { amount: number; count: number }>();
      departments.forEach((d) => deptMap.set(d.id, { amount: 0, count: 0 }));
      deptMap.set('uncategorized', { amount: 0, count: 0 });

      employees.forEach((e) => {
        const key = e.department_id || 'uncategorized';
        const entry = deptMap.get(key);
        if (entry) {
          entry.amount += Number(e.salary);
          entry.count += 1;
        }
      });

      const deptNameMap = new Map<string, string>();
      departments.forEach((d) => deptNameMap.set(d.id, d.name));
      deptNameMap.set('uncategorized', 'Uncategorized');

      const payrollByDepartment: PayrollByDeptItem[] = Array.from(deptMap.entries())
        .map(([id, data]) => ({
          department: deptNameMap.get(id) || 'Unknown',
          amount: data.amount,
          employeeCount: data.count,
        }))
        .filter((d) => d.employeeCount > 0)
        .sort((a, b) => b.amount - a.amount);

      // ── Payroll Trends ──
      const monthsList = getMonthsArray(6);
      const payrollTrends: PayrollTrendPoint[] = monthsList.map((m) => {
        const monthStart = new Date(m.start);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const monthCycles = completedCycles.filter((c) => {
          const cDate = new Date(c.period_start);
          return cDate >= monthStart && cDate <= monthEnd;
        });
        return {
          month: m.label,
          total: monthCycles.reduce((sum, c) => sum + Number(c.total_amount), 0),
          cycleCount: monthCycles.length,
        };
      });

      return {
        executive: {
          totalBalance,
          balanceChange: netChange,
          balanceChangePercent: Math.round(balanceChangePercent * 10) / 10,
          monthlyPayroll,
          payrollChange,
          activeEmployees,
          employeeChange,
          pendingApprovals: pendingApprovalCount,
          memberCount,
        },
        balanceHistory,
        transactionVolume,
        accountDistribution,
        payrollByDepartment,
        payrollTrends,
        recentTransactions: transactions.slice(0, 10),
        activePayrollCycles,
        pendingApprovalAmount,
        totalPayrollQuarter,
        averageSalary: Math.round(averageSalary),
      } as DashboardData;
    },
    enabled: !!orgId,
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30s
  });
}

// ──────────────── Individual Hooks (for targeted fetching) ────────────────

export function useBalanceHistory(orgId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: dashboardKeys.balanceHistory(orgId ?? '', days),
    queryFn: async () => {
      if (!orgId) return [];

      const now = new Date();
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - days);

      const { data: accounts } = await supabase
        .from('treasury_accounts')
        .select('balance')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      const totalBalance = (accounts || []).reduce((sum, a) => sum + Number(a.balance), 0);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('organization_id', orgId)
        .in('status', ['completed'])
        .gte('created_at', pastDate.toISOString())
        .order('created_at', { ascending: true });

      const daysList = getDaysArray(days);
      let runningBalance = totalBalance;
      return daysList.map((d) => {
        const dayTxs = (transactions || []).filter(
          (tx) => formatDate(new Date(tx.created_at)) === d.date
        );
        const dayNet = dayTxs.reduce((sum, tx) => {
          if (tx.type === 'deposit') return sum + Number(tx.amount);
          if (tx.type === 'payment' || tx.type === 'withdrawal') return sum - Number(tx.amount);
          return sum;
        }, 0);
        runningBalance -= dayNet;
        return {
          date: d.date,
          balance: Math.max(0, runningBalance),
          label: d.label,
        } as BalanceHistoryPoint;
      });
    },
    enabled: !!orgId,
  });
}

export function useAccountDistribution(orgId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.accountDistribution(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data: accounts } = await supabase
        .from('treasury_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      return (accounts || []).map((a) => ({
        name: a.name,
        value: Number(a.balance),
        color: ACCOUNT_TYPE_COLORS[a.type] || '#64748b',
        type: a.type,
      })) as AccountDistributionItem[];
    },
    enabled: !!orgId,
  });
}

export function usePayrollByDepartment(orgId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.payrollByDept(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];

      const [employeesResult, departmentsResult] = await Promise.all([
        supabase
          .from('payroll_employees')
          .select('salary, department_id')
          .eq('organization_id', orgId)
          .eq('status', 'active'),
        supabase
          .from('departments')
          .select('id, name')
          .eq('organization_id', orgId),
      ]);

      const employees = employeesResult.data || [];
      const departments = departmentsResult.data || [];

      const deptMap = new Map<string, { amount: number; count: number }>();
      departments.forEach((d) => deptMap.set(d.id, { amount: 0, count: 0 }));
      deptMap.set('uncategorized', { amount: 0, count: 0 });

      const deptNameMap = new Map<string, string>();
      departments.forEach((d) => deptNameMap.set(d.id, d.name));
      deptNameMap.set('uncategorized', 'Uncategorized');

      employees.forEach((e) => {
        const key = e.department_id || 'uncategorized';
        const entry = deptMap.get(key);
        if (entry) {
          entry.amount += Number(e.salary);
          entry.count += 1;
        }
      });

      return Array.from(deptMap.entries())
        .map(([id, data]) => ({
          department: deptNameMap.get(id) || 'Unknown',
          amount: data.amount,
          employeeCount: data.count,
        }))
        .filter((d) => d.employeeCount > 0)
        .sort((a, b) => b.amount - a.amount) as PayrollByDeptItem[];
    },
    enabled: !!orgId,
  });
}

export function usePayrollTrends(orgId: string | undefined, months: number = 6) {
  return useQuery({
    queryKey: dashboardKeys.payrollTrends(orgId ?? '', months),
    queryFn: async () => {
      if (!orgId) return [];

      const { data: cycles } = await supabase
        .from('payroll_cycles')
        .select('total_amount, period_start, status')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .order('period_start', { ascending: false })
        .limit(50);

      const completedCycles = (cycles || []) as PayrollCycle[];
      const monthsList = getMonthsArray(months);

      return monthsList.map((m) => {
        const monthStart = new Date(m.start);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const monthCycles = completedCycles.filter((c) => {
          const cDate = new Date(c.period_start);
          return cDate >= monthStart && cDate <= monthEnd;
        });
        return {
          month: m.label,
          total: monthCycles.reduce((sum, c) => sum + Number(c.total_amount), 0),
          cycleCount: monthCycles.length,
        } as PayrollTrendPoint;
      });
    },
    enabled: !!orgId,
  });
}

// ──────────────── CSV Export ────────────────

export function exportDashboardDataCSV(data: {
  balanceHistory: BalanceHistoryPoint[];
  transactionVolume: TransactionVolumePoint[];
  payrollByDepartment: PayrollByDeptItem[];
  payrollTrends: PayrollTrendPoint[];
}): void {
  const sections: string[] = [];

  // Balance History
  sections.push('Balance History');
  sections.push('Date,Balance');
  data.balanceHistory.forEach((b) => sections.push(`${b.date},${b.balance.toFixed(2)}`));
  sections.push('');

  // Transaction Volume
  sections.push('Transaction Volume');
  sections.push('Date,Transfers,Payments,Deposits,Withdrawals,Total');
  data.transactionVolume.forEach((v) =>
    sections.push(`${v.date},${v.transfers.toFixed(2)},${v.payments.toFixed(2)},${v.deposits.toFixed(2)},${v.withdrawals.toFixed(2)},${v.total.toFixed(2)}`)
  );
  sections.push('');

  // Payroll by Department
  sections.push('Payroll by Department');
  sections.push('Department,Amount,Employees');
  data.payrollByDepartment.forEach((d) =>
    sections.push(`"${d.department}",${d.amount.toFixed(2)},${d.employeeCount}`)
  );
  sections.push('');

  // Payroll Trends
  sections.push('Payroll Trends');
  sections.push('Month,Total,Cycles');
  data.payrollTrends.forEach((t) => sections.push(`${t.month},${t.total.toFixed(2)},${t.cycleCount}`));

  const csvContent = sections.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}