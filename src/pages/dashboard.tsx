import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../providers/organization-provider';
import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { supabase } from '../lib/supabase';
import { useDashboardData, exportDashboardDataCSV } from '../hooks/use-dashboard';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Wallet,
  Clock,
  TrendingUp,
  Download,
  BarChart3,
  RefreshCw,
  Send,
  UserPlus,
  Banknote,
  Calendar,
  Activity,
  Building2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from 'lucide-react';

// ──────────────── Recharts ────────────────
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ──────────────── Types ────────────────
type TabId = 'executive' | 'treasury' | 'payroll';
type DateRange = 7 | 30 | 90;

interface TabInfo {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabInfo[] = [
  { id: 'executive', label: 'Executive', icon: TrendingUp },
  { id: 'treasury', label: 'Treasury', icon: Wallet },
  { id: 'payroll', label: 'Payroll', icon: Banknote },
];

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

// ──────────────── Custom Tooltip ────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-900/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="mb-1 text-xs text-surface-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: ${p.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

// ──────────────── KPI Card ────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  iconBg,
  iconColor,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-150 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-surface-500">{title}</p>
            <p className="mt-1 truncate text-2xl font-bold text-foreground">{value}</p>
            {trend && trendValue && (
              <div className="mt-1 flex items-center gap-1">
                {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-danger" />}
                {trend === 'neutral' && <Clock className="h-3 w-3 text-surface-400" />}
                <span
                  className={`text-xs ${
                    trend === 'up'
                      ? 'text-success'
                      : trend === 'down'
                        ? 'text-danger'
                        : 'text-surface-400'
                  }`}
                >
                  {trendValue}
                </span>
              </div>
            )}
            {subtitle && !trend && (
              <p className="mt-1 text-xs text-surface-500">{subtitle}</p>
            )}
          </div>
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────── Empty State ────────────────

function ChartEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-surface-700 bg-surface-800/20 p-8">
      <BarChart3 className="mb-3 h-12 w-12 text-surface-600" />
      <p className="text-sm font-medium text-surface-400">{title}</p>
      <p className="mt-1 text-center text-xs text-surface-500">{message}</p>
    </div>
  );
}

// ──────────────── Executive Tab ────────────────

function ExecutiveTab({
  data,
  loading,
  days,
  onDateRangeChange,
}: {
  data: ReturnType<typeof useDashboardData>['data'];
  loading: boolean;
  days: DateRange;
  onDateRangeChange: (d: DateRange) => void;
}) {
  const navigate = useNavigate();
  const exec = data?.executive;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-surface-400" />
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onDateRangeChange(r.value)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                days === r.value
                  ? 'bg-privium-500 text-white'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (data) {
              exportDashboardDataCSV({
                balanceHistory: data.balanceHistory,
                transactionVolume: data.transactionVolume,
                payrollByDepartment: data.payrollByDepartment,
                payrollTrends: data.payrollTrends,
              });
            }
          }}
          disabled={loading || !data}
          className="cursor-pointer"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Balance"
          value={exec ? `$${(exec.totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}
          icon={Wallet}
          trend={exec && exec.balanceChange >= 0 ? 'up' : 'down'}
          trendValue={exec ? `${exec.balanceChange >= 0 ? '+' : ''}$${(exec.balanceChange).toLocaleString('en-US', { minimumFractionDigits: 0 })} (${exec.balanceChangePercent}%)` : undefined}
          iconBg="bg-privium-500/10"
          iconColor="text-privium-400"
          loading={loading}
        />
        <KpiCard
          title="Monthly Payroll"
          value={exec ? `$${exec.monthlyPayroll.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '$0'}
          icon={DollarSign}
          trend={exec && exec.payrollChange > 0 ? 'up' : exec && exec.payrollChange < 0 ? 'down' : 'neutral'}
          trendValue={exec ? `${exec.payrollChange >= 0 ? '+' : ''}$${Math.abs(exec.payrollChange).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : undefined}
          iconBg="bg-accent/10"
          iconColor="text-accent"
          loading={loading}
        />
        <KpiCard
          title="Active Employees"
          value={exec ? exec.activeEmployees.toLocaleString() : '0'}
          icon={Users}
          trend={exec && exec.employeeChange > 0 ? 'up' : 'neutral'}
          trendValue={exec && exec.employeeChange > 0 ? `+${exec.employeeChange} this period` : undefined}
          subtitle={exec ? `Avg salary: $${(data?.averageSalary || 0).toLocaleString()}` : undefined}
          iconBg="bg-success/10"
          iconColor="text-success"
          loading={loading}
        />
        <KpiCard
          title="Pending Approvals"
          value={exec ? exec.pendingApprovals.toString() : '0'}
          icon={Clock}
          trend={exec && exec.pendingApprovals > 0 ? 'down' : 'neutral'}
          trendValue={exec && exec.pendingApprovals > 0 ? `${exec.pendingApprovals} require action` : 'All clear'}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-privium-400" />
              Balance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : data?.balanceHistory.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.balanceHistory}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#balanceGradient)"
                    name="Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState title="No balance history yet" message="Transactions will appear here as you use the platform." />
            )}
          </CardContent>
        </Card>

        {/* Transaction Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-privium-400" />
              Transaction Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : data?.transactionVolume.length && data.transactionVolume.some((v) => v.total > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.transactionVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  />
                  <Bar dataKey="deposits" fill="#10b981" name="Deposits" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="payments" fill="#f59e0b" name="Payments" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="transfers" fill="#6366f1" name="Transfers" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState title="No transaction volume yet" message="Complete transactions to see volume data here." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/treasury')} className="cursor-pointer">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : data?.recentTransactions.length ? (
              <div className="space-y-1">
                {data.recentTransactions.map((tx) => {
                  const isInflow = tx.type === 'deposit';
                  const isOutflow = tx.type === 'payment' || tx.type === 'withdrawal';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-800/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                            isInflow ? 'bg-success/10' : isOutflow ? 'bg-danger/10' : 'bg-surface-700/50'
                          }`}
                        >
                          {isInflow ? (
                            <ArrowUpRight className="h-4 w-4 text-success" />
                          ) : isOutflow ? (
                            <ArrowDownRight className="h-4 w-4 text-danger" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-privium-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </p>
                          <p className="text-xs text-surface-500">
                            {tx.source_account?.name || 'External'} → {tx.destination_account?.name || 'External'}
                          </p>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0 text-right">
                        <p
                          className={`text-sm font-semibold ${
                            isInflow ? 'text-success' : isOutflow ? 'text-danger' : 'text-foreground'
                          }`}
                        >
                          {isInflow ? '+' : '-'}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </p>
                        <Badge
                          variant={
                            tx.status === 'completed'
                              ? 'success'
                              : tx.status === 'pending'
                                ? 'warning'
                                : tx.status === 'failed' || tx.status === 'declined'
                                  ? 'danger'
                                  : 'default'
                          }
                          size="sm"
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Activity className="mb-2 h-10 w-10 text-surface-600" />
                <p className="text-sm font-medium text-surface-400">No transactions yet</p>
                <p className="mt-1 text-xs text-surface-500">Create a transfer or deposit to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-between cursor-pointer transition-all duration-150 active:scale-[0.97]"
              variant="default"
              onClick={() => navigate('/treasury')}
            >
              <span>New Transfer</span>
              <Send className="h-4 w-4" />
            </Button>
            <Button
              className="w-full justify-between cursor-pointer transition-all duration-150 active:scale-[0.97]"
              variant="secondary"
              onClick={() => navigate('/payroll')}
            >
              <span>Run Payroll</span>
              <DollarSign className="h-4 w-4" />
            </Button>
            <Button
              className="w-full justify-between cursor-pointer transition-all duration-150 active:scale-[0.97]"
              variant="secondary"
              onClick={() => navigate('/organization')}
            >
              <span>Invite Member</span>
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              className="w-full justify-between cursor-pointer transition-all duration-150 active:scale-[0.97]"
              variant="outline"
              onClick={() => navigate('/treasury')}
            >
              <span>View Reports</span>
              <TrendingUp className="h-4 w-4" />
            </Button>

            {/* Org Health */}
            <div className="mt-6 rounded-lg bg-surface-800/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-surface-400">
                Organization Health
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">Members</span>
                  <span className="text-sm font-medium text-foreground">{exec?.memberCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">Active Cycles</span>
                  <Badge variant={data?.activePayrollCycles ? 'warning' : 'success'} size="sm">
                    {data?.activePayrollCycles || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">Q Payroll</span>
                  <span className="text-sm font-medium text-foreground">
                    ${(data?.totalPayrollQuarter || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────── Treasury Tab ────────────────

function TreasuryTab({
  data,
  loading,
}: {
  data: ReturnType<typeof useDashboardData>['data'];
  loading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Account Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-privium-400" />
              Account Distribution
            </CardTitle>
            <CardDescription>Balance breakdown by account</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : data?.accountDistribution.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.accountDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {data.accountDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                    formatter={(value: string) => (
                      <span className="text-surface-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState title="No accounts yet" message="Create treasury accounts to see distribution." />
            )}
          </CardContent>
        </Card>

        {/* Balance Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-privium-400" />
              Balance Trend
            </CardTitle>
            <CardDescription>Aggregate balance over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : data?.balanceHistory.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#6366f1' }}
                    name="Balance"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState title="No data yet" message="Balance history will appear as transactions are made." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Account Breakdown</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/treasury')} className="cursor-pointer">
            Manage Accounts
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.accountDistribution.length ? (
            <div className="divide-y divide-surface-800">
              {data.accountDistribution.map((account) => {
                const totalBalance = data.executive?.totalBalance || 1;
                const percent = (account.value / totalBalance) * 100;
                return (
                  <div key={account.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{account.name}</p>
                        <p className="text-xs capitalize text-surface-500">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        ${account.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-surface-500">{percent.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <Building2 className="mb-2 h-10 w-10 text-surface-600" />
              <p className="text-sm font-medium text-surface-400">No accounts yet</p>
              <p className="mt-1 text-xs text-surface-500">Create your first treasury account to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────── Payroll Tab ────────────────

function PayrollTab({
  data,
  loading,
}: {
  data: ReturnType<typeof useDashboardData>['data'];
  loading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Monthly Payroll"
          value={data ? `$${data.executive.monthlyPayroll.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '$0'}
          icon={DollarSign}
          iconBg="bg-accent/10"
          iconColor="text-accent"
          loading={loading}
        />
        <KpiCard
          title="Active Employees"
          value={data ? data.executive.activeEmployees.toLocaleString() : '0'}
          icon={Users}
          iconBg="bg-success/10"
          iconColor="text-success"
          loading={loading}
        />
        <KpiCard
          title="Average Salary"
          value={data ? `$${(data.averageSalary).toLocaleString()}` : '$0'}
          icon={TrendingUp}
          iconBg="bg-info/10"
          iconColor="text-info"
          loading={loading}
        />
        <KpiCard
          title="This Quarter"
          value={data ? `$${(data.totalPayrollQuarter).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '$0'}
          icon={Calendar}
          iconBg="bg-privium-500/10"
          iconColor="text-privium-400"
          subtitle={data ? `${data.executive.activeEmployees} employees` : undefined}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payroll by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-privium-400" />
              Payroll by Department
            </CardTitle>
            <CardDescription>Monthly salary allocation</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : data?.payrollByDepartment.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.payrollByDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" fill="#6366f1" name="Amount" radius={[0, 4, 4, 0]}>
                    {data.payrollByDepartment.map((_, index) => (
                      <Cell
                        key={index}
                        fill={
                          [
                            '#6366f1',
                            '#818cf8',
                            '#a5b4fc',
                            '#c7d2fe',
                            '#e0e7ff',
                          ][index % 5]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState title="No departments yet" message="Add employees to departments to see payroll breakdown." />
            )}
          </CardContent>
        </Card>

        {/* Payroll Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-privium-400" />
              Payroll Trends
            </CardTitle>
            <CardDescription>Monthly payroll over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : data?.payrollTrends.length && data.payrollTrends.some((t) => t.total > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.payrollTrends}>
                  <defs>
                    <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#payrollGradient)"
                    name="Total Payroll"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState title="No payroll data yet" message="Complete payroll cycles to see trends here." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Department Breakdown</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/payroll')} className="cursor-pointer">
            View Payroll
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.payrollByDepartment.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800 text-left text-xs font-medium uppercase tracking-wider text-surface-400">
                    <th className="pb-2 pr-4">Department</th>
                    <th className="pb-2 pr-4">Employees</th>
                    <th className="pb-2 pr-4">Total Salary</th>
                    <th className="pb-2 text-right">Avg Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {data.payrollByDepartment.map((dept) => (
                    <tr key={dept.department} className="transition-colors hover:bg-surface-800/30">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{dept.department}</td>
                      <td className="py-2.5 pr-4 text-surface-400">{dept.employeeCount}</td>
                      <td className="py-2.5 pr-4 text-foreground">
                        ${dept.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 text-right text-surface-400">
                        ${dept.employeeCount > 0 ? Math.round(dept.amount / dept.employeeCount).toLocaleString() : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <Users className="mb-2 h-10 w-10 text-surface-600" />
              <p className="text-sm font-medium text-surface-400">No employees yet</p>
              <p className="mt-1 text-xs text-surface-500">Add employees and assign them to departments to see breakdown.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────── Main Dashboard Page ────────────────

export default function DashboardPage() {
  const { currentOrgId } = useOrganization();
  const [activeTab, setActiveTab] = useState<TabId>('executive');
  const [days, setDays] = useState<DateRange>(30);

  const { data, isLoading, refetch, isRefetching } = useDashboardData(currentOrgId ?? undefined, days);

  // Real-time subscription for live updates
  useEffect(() => {
    if (!currentOrgId) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `organization_id=eq.${currentOrgId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `organization_id=eq.${currentOrgId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payroll_cycles', filter: `organization_id=eq.${currentOrgId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payroll_cycles', filter: `organization_id=eq.${currentOrgId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrgId, refetch]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const loading = isLoading;

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-800/50 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? 'bg-surface-800 text-foreground shadow-sm'
                      : 'text-surface-400 hover:text-surface-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="cursor-pointer"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'executive' && (
          <ExecutiveTab data={data} loading={loading} days={days} onDateRangeChange={setDays} />
        )}
        {activeTab === 'treasury' && <TreasuryTab data={data} loading={loading} />}
        {activeTab === 'payroll' && <PayrollTab data={data} loading={loading} />}
      </div>
    </AppShell>
  );
}