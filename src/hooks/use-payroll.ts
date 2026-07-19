import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

// ──────────────── Types ────────────────

export type PayrollEmployee = Tables<'payroll_employees'>;
export type PayrollCycle = Tables<'payroll_cycles'>;
export type PayrollCycleItem = Tables<'payroll_cycle_items'>;
export type Department = Tables<'departments'>;

export interface PayrollEmployeeWithDept extends PayrollEmployee {
  department: Pick<Department, 'name'> | null;
}

export interface PayrollCycleWithDetails extends PayrollCycle {
  creator_profile: { full_name: string | null; email: string } | null;
  approver_profile: { full_name: string | null; email: string } | null;
  items: (PayrollCycleItem & {
    employee: Pick<PayrollEmployee, 'name' | 'email' | 'type' | 'department_id'> & {
      department: Pick<Department, 'name'> | null;
    } | null;
  })[];
}

export interface PayrollDashboardStats {
  active_employees: number;
  total_monthly_payroll: number;
  pending_approval_count: number;
  pending_approval_amount: number;
  current_quarter_total: number;
  current_cycle: PayrollCycleWithDetails | null;
  recent_cycles: PayrollCycle[];
}

export const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
  intern: 'Intern',
};

export const EMPLOYEE_TYPE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'outline'> = {
  full_time: 'default',
  part_time: 'warning',
  contractor: 'info',
  intern: 'outline',
};

export const CYCLE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  calculated: 'Calculated',
  approved: 'Approved',
  funded: 'Funded',
  completed: 'Completed',
};

export const CYCLE_STATUS_COLORS: Record<string, 'warning' | 'info' | 'success' | 'outline' | 'default'> = {
  draft: 'default',
  calculated: 'info',
  approved: 'success',
  funded: 'warning',
  completed: 'outline',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  stablecoin: 'Stablecoin (USDC)',
  internal: 'Internal Credit',
};

// ──────────────── Query Keys ────────────────

export const payrollKeys = {
  all: ['payroll'] as const,
  employees: (orgId: string) => [...payrollKeys.all, 'employees', orgId] as const,
  employee: (id: string) => [...payrollKeys.all, 'employee', id] as const,
  cycles: (orgId: string) => [...payrollKeys.all, 'cycles', orgId] as const,
  cycle: (id: string) => [...payrollKeys.all, 'cycle', id] as const,
  cycleItems: (cycleId: string) => [...payrollKeys.all, 'cycle-items', cycleId] as const,
  dashboard: (orgId: string) => [...payrollKeys.all, 'dashboard', orgId] as const,
};

// ──────────────── Employee Hooks ────────────────

export function usePayrollEmployees(orgId: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.employees(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('payroll_employees')
        .select('*, department:departments(name)')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as PayrollEmployeeWithDept[];
    },
    enabled: !!orgId,
  });
}

export function usePayrollEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.employee(employeeId ?? ''),
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('payroll_employees')
        .select('*, department:departments(name)')
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      return data as unknown as PayrollEmployeeWithDept;
    },
    enabled: !!employeeId,
  });
}

// ──────────────── Payroll Cycle Hooks ────────────────

export function usePayrollCycles(orgId: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.cycles(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('payroll_cycles')
        .select('*')
        .eq('organization_id', orgId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as PayrollCycle[];
    },
    enabled: !!orgId,
  });
}

export function usePayrollCycle(cycleId: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.cycle(cycleId ?? ''),
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase
        .from('payroll_cycles')
        .select(`
          *,
          creator_profile:profiles!created_by(full_name, email),
          approver_profile:profiles!approved_by(full_name, email),
          items:payroll_cycle_items(
            *,
            employee:payroll_employees(
              name, email, type, department_id,
              department:departments(name)
            )
          )
        `)
        .eq('id', cycleId)
        .single();

      if (error) throw error;
      return data as unknown as PayrollCycleWithDetails;
    },
    enabled: !!cycleId,
  });
}

export function usePayrollCycleItems(cycleId: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.cycleItems(cycleId ?? ''),
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('payroll_cycle_items')
        .select('*, employee:payroll_employees(name, email, type, department_id, department:departments(name))')
        .eq('payroll_cycle_id', cycleId);

      if (error) throw error;
      return data as unknown as (PayrollCycleItem & {
        employee: Pick<PayrollEmployee, 'name' | 'email' | 'type' | 'department_id'> & {
          department: Pick<Department, 'name'> | null;
        } | null;
      })[];
    },
    enabled: !!cycleId,
  });
}

// ──────────────── Dashboard Hook ────────────────

export function usePayrollDashboard(orgId: string | undefined) {
  return useQuery({
    queryKey: payrollKeys.dashboard(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID required');

      // Active employees
      const { count: activeCount, error: empError } = await supabase
        .from('payroll_employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active');

      if (empError) throw empError;

      // Current cycle (latest draft/calculated/approved)
      const { data: currentCycle, error: cycleError } = await supabase
        .from('payroll_cycles')
        .select(`
          *,
          creator_profile:profiles!created_by(full_name, email),
          approver_profile:profiles!approved_by(full_name, email),
          items:payroll_cycle_items(
            *,
            employee:payroll_employees(
              name, email, type, department_id,
              department:departments(name)
            )
          )
        `)
        .eq('organization_id', orgId)
        .in('status', ['draft', 'calculated', 'approved', 'funded'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cycleError) throw cycleError;

      // Recent cycles (completed)
      const { data: recentCycles, error: recentError } = await supabase
        .from('payroll_cycles')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .order('period_start', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Pending approval cycles
      const { data: pendingCycles, error: pendingError } = await supabase
        .from('payroll_cycles')
        .select('total_amount')
        .eq('organization_id', orgId)
        .eq('status', 'calculated');

      if (pendingError) throw pendingError;

      const pendingApprovalCount = pendingCycles?.length || 0;
      const pendingApprovalAmount = pendingCycles?.reduce((sum, c) => sum + Number(c.total_amount), 0) || 0;

      // Current quarter totals
      const now = new Date();
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const { data: quarterData, error: quarterError } = await supabase
        .from('payroll_cycles')
        .select('total_amount')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .gte('period_start', quarterStart.toISOString().split('T')[0]);

      if (quarterError) throw quarterError;

      const currentQuarterTotal = quarterData?.reduce((sum, c) => sum + Number(c.total_amount), 0) || 0;

      // Monthly payroll total (from the most recent completed cycle)
      const monthlyPayroll = recentCycles?.[0]?.total_amount
        ? Number(recentCycles[0].total_amount)
        : (currentCycle?.total_amount ? Number(currentCycle.total_amount) : 0);

      return {
        active_employees: activeCount || 0,
        total_monthly_payroll: monthlyPayroll,
        pending_approval_count: pendingApprovalCount,
        pending_approval_amount: pendingApprovalAmount,
        current_quarter_total: currentQuarterTotal,
        current_cycle: currentCycle as PayrollCycleWithDetails | null,
        recent_cycles: recentCycles as PayrollCycle[],
      } as PayrollDashboardStats;
    },
    enabled: !!orgId,
  });
}

// ──────────────── Employee Mutations ────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TablesInsert<'payroll_employees'>) => {
      const { data, error } = await supabase
        .from('payroll_employees')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as PayrollEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.employees(data.organization_id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(data.organization_id) });
      toast.success('Employee added successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add employee');
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId: _orgId, ...updates }: { id: string; orgId: string } & Partial<TablesUpdate<'payroll_employees'>>) => {
      const { data, error } = await supabase
        .from('payroll_employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PayrollEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.employees(data.organization_id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.employee(data.id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(data.organization_id) });
      toast.success('Employee updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update employee');
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId: _orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase
        .from('payroll_employees')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.employees(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(variables.orgId) });
      toast.success('Employee deactivated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to deactivate employee');
    },
  });
}

// ──────────────── Payroll Cycle Mutations ────────────────

export function useCreatePayrollCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      period_start: string;
      period_end: string;
      created_by: string;
      notes?: string;
      employee_ids: string[];
    }) => {
      // Create the cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('payroll_cycles')
        .insert({
          organization_id: input.organization_id,
          period_start: input.period_start,
          period_end: input.period_end,
          status: 'draft',
          created_by: input.created_by,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // Fetch all selected employees to create cycle items
      const { data: employees, error: empError } = await supabase
        .from('payroll_employees')
        .select('id, salary, currency')
        .eq('organization_id', input.organization_id)
        .in('id', input.employee_ids)
        .eq('status', 'active');

      if (empError) throw empError;
      if (!employees?.length) {
        throw new Error('No active employees selected');
      }

      // Create cycle items with projected amounts
      const items = employees.map((emp) => ({
        payroll_cycle_id: cycle.id,
        employee_id: emp.id,
        amount: Number(emp.salary),
        currency: emp.currency || 'USD',
        status: 'pending' as const,
      }));

      const { error: itemsError } = await supabase
        .from('payroll_cycle_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update the cycle total amount
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const { error: updateError } = await supabase
        .from('payroll_cycles')
        .update({ total_amount: totalAmount })
        .eq('id', cycle.id);

      if (updateError) throw updateError;

      return cycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycles(data.organization_id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(data.organization_id) });
      toast.success('Payroll cycle created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create payroll cycle');
    },
  });
}

export function useCalculatePayrollCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cycleId, orgId: _orgId }: { cycleId: string; orgId: string }) => {
      // Mark all items as calculated
      const { error: itemsError } = await supabase
        .from('payroll_cycle_items')
        .update({ status: 'calculated' })
        .eq('payroll_cycle_id', cycleId);

      if (itemsError) throw itemsError;

      // Update cycle status
      const { error: cycleError } = await supabase
        .from('payroll_cycles')
        .update({ status: 'calculated' })
        .eq('id', cycleId);

      if (cycleError) throw cycleError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycle(variables.cycleId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycles(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(variables.orgId) });
      toast.success('Payroll cycle calculated — ready for review');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to calculate payroll cycle');
    },
  });
}

export function useApprovePayrollCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cycleId, orgId: _orgId, approvedBy }: { cycleId: string; orgId: string; approvedBy: string }) => {
      const { error } = await supabase
        .from('payroll_cycles')
        .update({
          status: 'approved',
          approved_by: approvedBy,
        })
        .eq('id', cycleId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycle(variables.cycleId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycles(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(variables.orgId) });
      toast.success('Payroll cycle approved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to approve payroll cycle');
    },
  });
}

export function useFundPayrollCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      orgId,
      sourceAccountId,
      userId,
    }: {
      cycleId: string;
      orgId: string;
      sourceAccountId: string;
      userId: string;
    }) => {
      // Get cycle info
      const { data: cycle, error: cycleError } = await supabase
        .from('payroll_cycles')
        .select('total_amount, currency')
        .eq('id', cycleId)
        .single();

      if (cycleError || !cycle) throw new Error('Payroll cycle not found');

      // Get source account
      const { data: sourceAccount, error: srcError } = await supabase
        .from('treasury_accounts')
        .select('balance')
        .eq('id', sourceAccountId)
        .single();

      if (srcError || !sourceAccount) throw new Error('Source account not found');

      const amount = Number(cycle.total_amount);
      if (Number(sourceAccount.balance) < amount) {
        throw new Error('Insufficient balance in the selected account');
      }

      // Deduct from source account
      const { error: deductError } = await supabase
        .from('treasury_accounts')
        .update({ balance: Number(sourceAccount.balance) - amount })
        .eq('id', sourceAccountId);

      if (deductError) throw deductError;

      // Create a transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          organization_id: orgId,
          source_account_id: sourceAccountId,
          amount,
          currency: cycle.currency || 'USD',
          type: 'payment',
          status: 'completed',
          description: `Payroll funding for cycle ${cycleId}`,
          created_by: userId,
          completed_at: new Date().toISOString(),
        });

      if (txError) throw txError;

      // Update cycle status
      const { error: updateError } = await supabase
        .from('payroll_cycles')
        .update({ status: 'funded' })
        .eq('id', cycleId);

      if (updateError) throw updateError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycle(variables.cycleId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycles(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'accounts', variables.orgId] });
      queryClient.invalidateQueries({ queryKey: ['treasury', 'transactions', variables.orgId] });
      toast.success('Payroll cycle funded');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to fund payroll cycle');
    },
  });
}

export function useCompletePayrollCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cycleId, orgId: _orgId }: { cycleId: string; orgId: string }) => {
      // Mark all items as paid
      const { error: itemsError } = await supabase
        .from('payroll_cycle_items')
        .update({ status: 'paid' })
        .eq('payroll_cycle_id', cycleId);

      if (itemsError) throw itemsError;

      // Update cycle status
      const { error: cycleError } = await supabase
        .from('payroll_cycles')
        .update({ status: 'completed' })
        .eq('id', cycleId);

      if (cycleError) throw cycleError;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycle(variables.cycleId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.cycles(variables.orgId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.dashboard(variables.orgId) });
      toast.success('Payroll cycle completed!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to complete payroll cycle');
    },
  });
}

// ──────────────── CSV Export ────────────────

export function exportPayrollReportCSV(
  _cycles: PayrollCycle[],
  cycleItems: (PayrollCycleItem & {
    employee: { name: string; email: string; type: string } | null;
  })[],
  cycle: PayrollCycle,
): void {
  const headers = ['Employee', 'Email', 'Type', 'Amount', 'Currency', 'Status', 'Period'];
  const rows = cycleItems.map((item) => [
    item.employee?.name || 'Unknown',
    item.employee?.email || '',
    item.employee?.type || '',
    Number(item.amount).toFixed(2),
    item.currency,
    item.status,
    `${cycle.period_start} to ${cycle.period_end}`,
  ]);

  const csvContent = [
    `Payroll Report - ${cycle.period_start} to ${cycle.period_end}`,
    `Total: $${Number(cycle.total_amount).toFixed(2)}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `payroll-report-${cycle.period_start}-${cycle.period_end}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Payroll report exported');
}