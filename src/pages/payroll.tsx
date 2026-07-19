import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';
import { useOrganization } from '../providers/organization-provider';
import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Dialog } from '../components/ui/dialog';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/skeleton';
import {
  usePayrollDashboard,
  usePayrollEmployees,
  usePayrollCycles,
  usePayrollCycle,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useCreatePayrollCycle,
  useCalculatePayrollCycle,
  useApprovePayrollCycle,
  useFundPayrollCycle,
  useCompletePayrollCycle,
  EMPLOYEE_TYPE_LABELS,
  EMPLOYEE_TYPE_COLORS,
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_COLORS,
  type PayrollEmployeeWithDept,
  type PayrollCycleWithDetails,
} from '../hooks/use-payroll';
import { useDepartments } from '../hooks/use-organization';
import { useTreasuryAccounts } from '../hooks/use-treasury';
import {
  DollarSign,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Download,
  Search,
  Edit3,
  UserPlus,
  Ban,
  ChevronRight,
  Loader2,
  Wallet,
  ChevronLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type Tab = 'dashboard' | 'employees' | 'cycles' | 'history';

// ──────────────── Helper Components ────────────────

function TabNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'employees', label: 'Employees', icon: <Users className="h-4 w-4" /> },
    { id: 'cycles', label: 'Cycles', icon: <Calendar className="h-4 w-4" /> },
    { id: 'history', label: 'History', icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
            active === tab.id
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'success';
}) {
  return (
    <Card
      className={`${
        variant === 'warning'
          ? 'border-warning/30 bg-warning/5'
          : variant === 'success'
            ? 'border-success/30 bg-success/5'
            : ''
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div
            className={`rounded-lg p-2 ${
              variant === 'warning'
                ? 'bg-warning/10 text-warning'
                : variant === 'success'
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        <div className="mt-1 flex items-center gap-2">
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && trendLabel && (
            <span
              className={`inline-flex items-center gap-1 text-xs ${
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
              {trendLabel}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ──────────────── Add Employee Dialog ────────────────

function AddEmployeeDialog({
  open,
  onClose,
  orgId,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  departments: { id: string; name: string }[];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'full_time' | 'part_time' | 'contractor' | 'intern'>('full_time');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [departmentId, setDepartmentId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createEmployee = useCreateEmployee();

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!salary || Number(salary) <= 0) newErrors.salary = 'Valid salary is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await createEmployee.mutateAsync({
      organization_id: orgId,
      name: name.trim(),
      email: email.trim(),
      type,
      salary: Number(salary),
      currency,
      department_id: departmentId || null,
      wallet_address: walletAddress.trim() || null,
      status: 'active',
    });

    setName('');
    setEmail('');
    setType('full_time');
    setSalary('');
    setCurrency('USD');
    setDepartmentId('');
    setWalletAddress('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Employee" description="Add a new employee to your payroll">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              error={errors.name}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              type="email"
              error={errors.email}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Employee Type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            options={[
              { value: 'full_time', label: 'Full-time' },
              { value: 'part_time', label: 'Part-time' },
              { value: 'contractor', label: 'Contractor' },
              { value: 'intern', label: 'Intern' },
            ]}
          />
          <Select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={[
              { value: '', label: 'No Department' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Salary / Amount</label>
            <Input
              value={salary}
              onChange={(e) => setSalary(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="75000"
              type="text"
              error={errors.salary}
            />
          </div>
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'USDC', label: 'USDC (Stablecoin)' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Wallet Address <span className="text-muted-foreground">(optional — for stablecoin payroll)</span>
          </label>
          <Input
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createEmployee.isPending}>
            {createEmployee.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ──────────────── Edit Employee Dialog ────────────────

function EditEmployeeDialog({
  open,
  onClose,
  employee,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  employee: PayrollEmployeeWithDept | null;
  departments: { id: string; name: string }[];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'full_time' | 'part_time' | 'contractor' | 'intern'>('full_time');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [departmentId, setDepartmentId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const updateEmployee = useUpdateEmployee();

  // Sync state when employee changes
  useState(() => {
    if (employee) {
      setName(employee.name);
      setEmail(employee.email);
      setType(employee.type as typeof type);
      setSalary(String(employee.salary));
      setCurrency(employee.currency);
      setDepartmentId(employee.department_id || '');
      setWalletAddress(employee.wallet_address || '');
    }
  });

  const handleSubmit = async () => {
    if (!employee) return;
    await updateEmployee.mutateAsync({
      id: employee.id,
      orgId: employee.organization_id,
      name: name.trim(),
      email: email.trim(),
      type,
      salary: Number(salary),
      currency,
      department_id: departmentId || null,
      wallet_address: walletAddress.trim() || null,
    });
    onClose();
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Edit Employee" description={`Update ${employee.name}'s details`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" type="email" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Employee Type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            options={[
              { value: 'full_time', label: 'Full-time' },
              { value: 'part_time', label: 'Part-time' },
              { value: 'contractor', label: 'Contractor' },
              { value: 'intern', label: 'Intern' },
            ]}
          />
          <Select
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={[
              { value: '', label: 'No Department' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Salary / Amount</label>
            <Input value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="75000" />
          </div>
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'USDC', label: 'USDC (Stablecoin)' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Wallet Address</label>
          <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Edit3 className="mr-2 h-4 w-4" />Save Changes</>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ──────────────── Create Cycle Dialog ────────────────

function CreateCycleDialog({
  open,
  onClose,
  orgId,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  employees: PayrollEmployeeWithDept[];
}) {
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const { user } = useAuth();

  const createCycle = useCreatePayrollCycle();

  const activeEmployees = employees.filter((e) => e.status === 'active');

  const getPeriodDates = () => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let start: Date;
    switch (frequency) {
      case 'weekly':
        start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 6);
        break;
      case 'biweekly':
        start = new Date(now);
        const dayOfMonth = start.getDate();
        start.setDate(dayOfMonth <= 15 ? 1 : 16);
        end.setDate(dayOfMonth <= 15 ? 15 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate());
        break;
      case 'monthly':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const toggleAll = () => {
    if (selectedEmployees.size === activeEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(activeEmployees.map((e) => e.id)));
    }
  };

  const toggleEmployee = (id: string) => {
    const next = new Set(selectedEmployees);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmployees(next);
  };

  const handleCreate = async () => {
    if (!user?.id || selectedEmployees.size === 0) return;
    const dates = getPeriodDates();
    await createCycle.mutateAsync({
      organization_id: orgId,
      period_start: dates.start,
      period_end: dates.end,
      created_by: user.id,
      notes: notes || undefined,
      employee_ids: Array.from(selectedEmployees),
    });
    onClose();
  };

  const totalSelected = activeEmployees
    .filter((e) => selectedEmployees.has(e.id))
    .reduce((sum, e) => sum + Number(e.salary), 0);

  return (
    <Dialog open={open} onClose={onClose} title="New Payroll Cycle" description="Select employees and configure the cycle">
      <div className="space-y-4">
        <Select
          label="Pay Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'biweekly', label: 'Bi-weekly' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />

        <div className="text-sm">
          <span className="text-muted-foreground">Period: </span>
          <span className="font-medium text-foreground">
            {getPeriodDates().start} → {getPeriodDates().end}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">Select Employees</label>
            <button
              onClick={toggleAll}
              className="text-xs text-privium-500 hover:text-privium-400 transition-colors cursor-pointer"
            >
              {selectedEmployees.size === activeEmployees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
            {activeEmployees.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No active employees</p>
            )}
            {activeEmployees.map((emp) => (
              <label
                key={emp.id}
                className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.has(emp.id)}
                  onChange={() => toggleEmployee(emp.id)}
                  className="h-4 w-4 rounded border-border text-privium-500 focus:ring-privium-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {EMPLOYEE_TYPE_LABELS[emp.type]} — ${Number(emp.salary).toLocaleString()}
                    {emp.department && ` • ${emp.department.name}`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[80px] w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-privium-500 focus:outline-none focus:ring-1 focus:ring-privium-500 transition-colors"
            placeholder="Any notes for this cycle..."
          />
        </div>

        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} selected
            </span>
            <span className="text-lg font-bold text-foreground">
              ${totalSelected.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={selectedEmployees.size === 0 || createCycle.isPending}
          >
            {createCycle.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
            ) : (
              <><Calendar className="mr-2 h-4 w-4" />Create Cycle</>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ──────────────── Cycle Detail Panel ────────────────

function CycleDetailPanel({
  cycle,
  onClose: _onClose,
  orgId,
  userRole,
  userId,
}: {
  cycle: PayrollCycleWithDetails | null;
  onClose: () => void;
  orgId: string;
  userRole: string | null;
  userId: string | undefined;
}) {
  const { data: treasuryAccounts } = useTreasuryAccounts(orgId);
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [showFundDialog, setShowFundDialog] = useState(false);

  const calculateMutation = useCalculatePayrollCycle();
  const approveMutation = useApprovePayrollCycle();
  const fundMutation = useFundPayrollCycle();
  const completeMutation = useCompletePayrollCycle();

  if (!cycle) return null;

  const canCalculate = cycle.status === 'draft' && (userRole === 'admin' || userRole === 'manager' || userRole === 'finance');
  const canApprove = cycle.status === 'calculated' && (userRole === 'admin' || userRole === 'manager');
  const canFund = cycle.status === 'approved' && (userRole === 'admin' || userRole === 'finance');
  const canComplete = cycle.status === 'funded' && (userRole === 'admin');

  const handleFund = async () => {
    if (!fundingAccountId || !userId) return;
    await fundMutation.mutateAsync({
      cycleId: cycle.id,
      orgId,
      sourceAccountId: fundingAccountId,
      userId,
    });
    setShowFundDialog(false);
  };

  const payrollAccounts = treasuryAccounts?.filter((a) => a.type === 'payroll' || a.type === 'operating') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              {cycle.period_start} — {cycle.period_end}
            </h3>
            <Badge variant={CYCLE_STATUS_COLORS[cycle.status]}>{CYCLE_STATUS_LABELS[cycle.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created by {cycle.creator_profile?.full_name || cycle.creator_profile?.email || 'Unknown'}
            {cycle.approver_profile && ` • Approved by ${cycle.approver_profile.full_name || cycle.approver_profile.email}`}
          </p>
          {cycle.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">"{cycle.notes}"</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">${Number(cycle.total_amount).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{cycle.items?.length || 0} employees</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canCalculate && (
          <Button
            size="sm"
            onClick={() => calculateMutation.mutate({ cycleId: cycle.id, orgId })}
            disabled={calculateMutation.isPending}
          >
            {calculateMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
            Calculate
          </Button>
        )}
        {canApprove && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => approveMutation.mutate({ cycleId: cycle.id, orgId, approvedBy: userId! })}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
            Approve
          </Button>
        )}
        {canFund && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFundDialog(true)}
          >
            <Wallet className="mr-1 h-3 w-3" />
            Fund Cycle
          </Button>
        )}
        {canComplete && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => completeMutation.mutate({ cycleId: cycle.id, orgId })}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
            Complete
          </Button>
        )}
      </div>

      {/* Fund Dialog */}
      <Dialog open={showFundDialog} onClose={() => setShowFundDialog(false)} title="Fund Payroll Cycle" description="Select a treasury account to fund this cycle">
        <div className="space-y-4">
          <Select
            label="Source Account"
            value={fundingAccountId}
            onChange={(e) => setFundingAccountId(e.target.value)}
            placeholder="Select account..."
            options={payrollAccounts.map((a) => ({
              value: a.id,
              label: `${a.name} ($${Number(a.balance).toLocaleString()} available)`,
            }))}
          />
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cycle Total</span>
              <span className="font-semibold">${Number(cycle.total_amount).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowFundDialog(false)}>Cancel</Button>
            <Button onClick={handleFund} disabled={!fundingAccountId || fundMutation.isPending}>
              {fundMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Funding...</>
              ) : (
                <><Wallet className="mr-2 h-4 w-4" />Fund ${Number(cycle.total_amount).toLocaleString()}</>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Employee Items */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Employee Breakdown</h4>
        <div className="space-y-2">
          {cycle.items?.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-privium-500/10 text-sm font-semibold text-privium-500">
                  {item.employee?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.employee?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.employee?.email}
                    {item.employee?.department?.name && ` • ${item.employee.department.name}`}
                    {item.employee?.type && ` • ${EMPLOYEE_TYPE_LABELS[item.employee.type]}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  ${Number(item.amount).toLocaleString()}
                </span>
                <Badge
                  variant={
                    item.status === 'paid' ? 'success' :
                    item.status === 'calculated' ? 'info' :
                    'warning'
                  }
                  size="sm"
                >
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────── Main Page ────────────────

export default function PayrollPage() {
  const { currentOrganization: organization } = useOrganization();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PayrollEmployeeWithDept | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('active');

  const orgId = organization?.id;

  // Data hooks
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = usePayrollDashboard(orgId);
  const { data: employees, isLoading: employeesLoading } = usePayrollEmployees(orgId);
  const { data: cycles, isLoading: cyclesLoading } = usePayrollCycles(orgId);
  const { data: selectedCycle, isLoading: cycleLoading } = usePayrollCycle(selectedCycleId || undefined);
  const { data: departments } = useDepartments(orgId);
  const { data: userRole } = useQuery({
    queryKey: ['organizations', 'my-role', orgId],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;
      const { data } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      return data?.role as string | null;
    },
    enabled: !!orgId && !!user?.id,
  });
  const deleteEmployee = useDeleteEmployee();

  // Filtered employees
  const filteredEmployees = (employees || []).filter((emp) => {
    const matchesSearch = !searchQuery || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = employeeTypeFilter === 'all' || emp.type === employeeTypeFilter;
    const matchesStatus = employeeStatusFilter === 'all' || emp.status === employeeStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Completed cycles for history
  const completedCycles = (cycles || []).filter((c) => c.status === 'completed');

  return (
    <AppShell title="Payroll">
      <TabNav active={activeTab} onChange={setActiveTab} />

      {/* ────────── DASHBOARD TAB ────────── */}
      {activeTab === 'dashboard' && (
        <div>
          {dashboardLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </div>
              <SkeletonCard />
            </div>
          ) : dashboardError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
              <h3 className="text-lg font-semibold text-foreground">Could not load dashboard</h3>
              <p className="mt-1 text-sm text-muted-foreground">We couldn't load your payroll data — try again?</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <StatCard
                  title="Active Employees"
                  value={String(dashboard?.active_employees || 0)}
                  icon={<Users className="h-5 w-5" />}
                  subtitle={(() => {
                    const types = employees?.filter(e => e.status === 'active').reduce((acc, e) => {
                      acc[e.type] = (acc[e.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    return types ? Object.entries(types).map(([k, v]) => `${v} ${EMPLOYEE_TYPE_LABELS[k]}`).join(', ') : '';
                  })()}
                />
                <StatCard
                  title="Monthly Payroll"
                  value={`$${(dashboard?.total_monthly_payroll || 0).toLocaleString()}`}
                  icon={<DollarSign className="h-5 w-5" />}
                  subtitle={dashboard?.current_cycle ? `Next cycle: ${dashboard.current_cycle.period_start}` : undefined}
                />
                {dashboard?.pending_approval_count && dashboard.pending_approval_count > 0 ? (
                  <StatCard
                    title="Pending Approval"
                    value={`$${dashboard.pending_approval_amount.toLocaleString()}`}
                    icon={<AlertCircle className="h-5 w-5" />}
                    subtitle={`${dashboard.pending_approval_count} cycle${dashboard.pending_approval_count > 1 ? 's' : ''} awaiting approval`}
                    variant="warning"
                  />
                ) : (
                  <StatCard
                    title="Pending Approval"
                    value="$0"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    subtitle="All caught up!"
                    variant="success"
                  />
                )}
                <StatCard
                  title="This Quarter"
                  value={`$${(dashboard?.current_quarter_total || 0).toLocaleString()}`}
                  icon={<BarChart3 className="h-5 w-5" />}
                  subtitle="Total payroll disbursed"
                />
              </div>

              {/* Current Cycle + Recent Cycles */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Current Cycle */}
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Current Payroll Cycle</CardTitle>
                      <CardDescription>
                        {dashboard?.current_cycle
                          ? `${dashboard.current_cycle.period_start} — ${dashboard.current_cycle.period_end}`
                          : 'No active cycle'}
                      </CardDescription>
                    </div>
                    {dashboard?.current_cycle && (
                      <Badge variant={CYCLE_STATUS_COLORS[dashboard.current_cycle.status]} size="lg">
                        {CYCLE_STATUS_LABELS[dashboard.current_cycle.status]}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!dashboard?.current_cycle ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-foreground">No active cycle</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Create a new payroll cycle to get started</p>
                        <Button size="sm" className="mt-4" onClick={() => setShowCreateCycle(true)}>
                          <Plus className="mr-1 h-3 w-3" />
                          Create Cycle
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboard.current_cycle.items?.slice(0, 8).map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                {item.employee?.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.employee?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.employee?.department?.name || EMPLOYEE_TYPE_LABELS[item.employee?.type || ''] || ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-foreground">
                                ${Number(item.amount).toLocaleString()}
                              </span>
                              <Badge
                                variant={
                                  item.status === 'paid' ? 'success' :
                                  item.status === 'calculated' ? 'info' :
                                  'warning'
                                }
                                size="sm"
                              >
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">Total</p>
                            <p className="text-xs text-muted-foreground">
                              {dashboard.current_cycle.items?.length || 0} employees
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              ${Number(dashboard.current_cycle.total_amount).toLocaleString()}
                            </p>
                            <button
                              onClick={() => setSelectedCycleId(dashboard.current_cycle!.id)}
                              className="text-xs text-privium-500 hover:text-privium-400 transition-colors cursor-pointer"
                            >
                              View details →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Cycles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Cycles</CardTitle>
                    <CardDescription>Last 5 payroll runs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!dashboard?.recent_cycles?.length ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No completed cycles yet</p>
                    ) : (
                      dashboard.recent_cycles.map((cycle) => (
                        <div
                          key={cycle.id}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                          onClick={() => { setSelectedCycleId(cycle.id); setActiveTab('history'); }}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm text-foreground">{cycle.period_start} — {cycle.period_end}</span>
                              <p className="text-xs text-muted-foreground">{CYCLE_STATUS_LABELS[cycle.status]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              ${Number(cycle.total_amount).toLocaleString()}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ────────── EMPLOYEES TAB ────────── */}
      {activeTab === 'employees' && (
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full rounded-lg border border-border bg-transparent pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-privium-500 focus:outline-none focus:ring-1 focus:ring-privium-500 transition-colors"
                />
              </div>
              <Select
                value={employeeTypeFilter}
                onChange={(e) => setEmployeeTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'full_time', label: 'Full-time' },
                  { value: 'part_time', label: 'Part-time' },
                  { value: 'contractor', label: 'Contractor' },
                  { value: 'intern', label: 'Intern' },
                ]}
                className="w-36"
              />
              <Select
                value={employeeStatusFilter}
                onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'all', label: 'All Status' },
                ]}
                className="w-36"
              />
            </div>
            <Button onClick={() => setShowAddEmployee(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>

          {/* Employee List */}
          {employeesLoading ? (
            <SkeletonTable rows={6} />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={searchQuery ? "No employees match your search" : "No employees yet"}
              description={
                searchQuery
                  ? "Try a different name or email"
                  : "Add your first employee to start building your payroll"
              }
              action={!searchQuery ? { label: 'Add Employee', onClick: () => setShowAddEmployee(true) } : undefined}
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Salary</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Wallet</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-privium-500/10 text-sm font-semibold text-privium-500">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={EMPLOYEE_TYPE_COLORS[emp.type]} size="sm">
                            {EMPLOYEE_TYPE_LABELS[emp.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {emp.department?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-foreground">
                            ${Number(emp.salary).toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{emp.currency}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={emp.status === 'active' ? 'success' : 'outline'} size="sm">
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {emp.wallet_address ? (
                            <span className="text-xs text-muted-foreground font-mono">
                              {emp.wallet_address.slice(0, 6)}...{emp.wallet_address.slice(-4)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingEmployee(emp)}
                              className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit employee"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {emp.status === 'active' && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Deactivate ${emp.name}?`)) {
                                    deleteEmployee.mutate({ id: emp.id, orgId: orgId! });
                                  }
                                }}
                                className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                title="Deactivate employee"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dialogs */}
          <AddEmployeeDialog
            open={showAddEmployee}
            onClose={() => setShowAddEmployee(false)}
            orgId={orgId!}
            departments={departments || []}
          />
          <EditEmployeeDialog
            open={!!editingEmployee}
            onClose={() => setEditingEmployee(null)}
            employee={editingEmployee}
            departments={departments || []}
          />
        </div>
      )}

      {/* ────────── CYCLES TAB ────────── */}
      {activeTab === 'cycles' && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Manage payroll cycles — create, calculate, approve, and fund</p>
            </div>
            <Button onClick={() => setShowCreateCycle(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Button>
          </div>

          {cyclesLoading ? (
            <SkeletonTable rows={4} />
          ) : cycles && cycles.length > 0 ? (
            <div className="space-y-4">
              {cycles.filter((c) => c.status !== 'completed').map((cycle) => (
                <Card
                  key={cycle.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedCycleId === cycle.id ? 'ring-2 ring-privium-500' : ''
                  }`}
                  onClick={() => setSelectedCycleId(
                    selectedCycleId === cycle.id ? null : cycle.id
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {cycle.period_start} — {cycle.period_end}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(cycle.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            ${Number(cycle.total_amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{cycle.currency}</p>
                        </div>
                        <Badge variant={CYCLE_STATUS_COLORS[cycle.status]} size="lg">
                          {CYCLE_STATUS_LABELS[cycle.status]}
                        </Badge>
                        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                          selectedCycleId === cycle.id ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Cycle Detail */}
              {selectedCycleId && (
                <Card>
                  <CardContent className="p-6">
                    {cycleLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : selectedCycle ? (
                      <CycleDetailPanel
                        cycle={selectedCycle}
                        onClose={() => setSelectedCycleId(null)}
                        orgId={orgId!}
                        userRole={userRole ?? null}
                        userId={user?.id}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No payroll cycles yet"
              description="Create your first payroll cycle to start managing employee payments"
              action={{ label: 'Create Cycle', onClick: () => setShowCreateCycle(true) }}
            />
          )}

          <CreateCycleDialog
            open={showCreateCycle}
            onClose={() => setShowCreateCycle(false)}
            orgId={orgId!}
            employees={employees || []}
          />
        </div>
      )}

      {/* ────────── HISTORY TAB ────────── */}
      {activeTab === 'history' && (
        <div>
          {cyclesLoading ? (
            <SkeletonTable rows={4} />
          ) : completedCycles.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No completed cycles"
              description="Completed payroll cycles will appear here. Use the Cycles tab to manage and complete cycles."
            />
          ) : selectedCycleId ? (
            <div>
              <button
                onClick={() => setSelectedCycleId(null)}
                className="flex items-center gap-1 text-sm text-privium-500 hover:text-privium-400 transition-colors mb-4 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to History
              </button>
              <Card>
                <CardContent className="p-6">
                  {cycleLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : selectedCycle ? (
                    <CycleDetailPanel
                      cycle={selectedCycle}
                      onClose={() => setSelectedCycleId(null)}
                      orgId={orgId!}
                      userRole={userRole ?? null}
                      userId={user?.id}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  {completedCycles.length} completed cycle{completedCycles.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {completedCycles.map((cycle) => (
                  <Card
                    key={cycle.id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedCycleId(cycle.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg bg-success/10 p-2 text-success">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {cycle.period_start} — {cycle.period_end}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Completed • {new Date(cycle.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
                            ${Number(cycle.total_amount).toLocaleString()}
                          </span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}