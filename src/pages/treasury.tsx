import { useState, useMemo } from 'react';
import { useAuth } from '../providers/auth-provider';
import { useOrganization } from '../providers/organization-provider';
import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Dialog } from '../components/ui/dialog';
import { Skeleton, SkeletonCard } from '../components/ui/skeleton';
import { formatCurrency, formatDate, formatRelativeTime } from '../lib/utils';
import {
  useTreasuryAccounts,
  useTransactions,
  useApprovalRequests,
  useCreateAccount,
  useCreateTransfer,
  useApproveTransfer,
  useDeclineTransfer,
  exportTransactionsToCSV,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_COLORS,
  type TreasuryAccount,
  type TransactionWithAccounts,
  type ApprovalRequestWithDetails,
  type AccountType,
} from '../hooks/use-treasury';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Shield,
  Download,
  Search,
  X,
  Check,
  Building2,
  PiggyBank,
  Landmark,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowLeft,
  History,
  DollarSign,
  ArrowRightLeft,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ──────────────── Types ────────────────

type ViewMode = 'dashboard' | 'transactions' | 'approvals' | 'policies';

const ACCOUNT_ICONS: Record<AccountType, typeof Wallet> = {
  operating: Building2,
  reserve: PiggyBank,
  payroll: DollarSign,
  treasury: Landmark,
};

// ──────────────── Custom Tooltip ────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ──────────────── Treasury Page ────────────────

export default function TreasuryPage() {
  const { profile } = useAuth();
  const { currentOrganization: organization } = useOrganization();
  const orgId = organization?.id;

  const [view, setView] = useState<ViewMode>('dashboard');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TreasuryAccount | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionWithAccounts | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: accounts, isLoading: accountsLoading } = useTreasuryAccounts(orgId);
  const { data: transactions, isLoading: txsLoading } = useTransactions(orgId, {
    search: searchQuery || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    limit: view === 'dashboard' ? 10 : 100,
  });
  const { data: approvals, isLoading: approvalsLoading } = useApprovalRequests(orgId);

  const createAccount = useCreateAccount();
  const createTransfer = useCreateTransfer();
  const approveTransfer = useApproveTransfer();
  const declineTransfer = useDeclineTransfer();

  const pendingApprovals = useMemo(
    () => (approvals || []).filter((a) => a.status === 'pending'),
    [approvals]
  );

  const totalBalance = useMemo(
    () => (accounts || []).reduce((sum, a) => sum + Number(a.balance), 0),
    [accounts]
  );

  // Generate chart data based on accounts and transactions
  const chartData = useMemo(() => {
    const days = chartRange === '7d' ? 7 : chartRange === '30d' ? 30 : 90;
    const data: { date: string; balance: number; deposits: number; withdrawals: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTxs = (transactions || []).filter((tx) => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        return txDate === dateStr;
      });

      const deposits = dayTxs
        .filter((tx) => tx.type === 'deposit' || tx.type === 'transfer')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const withdrawals = dayTxs
        .filter((tx) => tx.type === 'withdrawal' || tx.type === 'payment')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      // Simulate a running balance for chart purposes
      const baseBalance = totalBalance;
      const simulatedBalance = baseBalance - deposits + withdrawals + (Math.random() * 10000 - 5000);

      data.push({
        date: dateStr,
        balance: Math.max(simulatedBalance, 0),
        deposits,
        withdrawals,
      });
    }

    return data;
  }, [chartRange, transactions, totalBalance]);

  // Account type distribution
  const accountDistribution = useMemo(() => {
    if (!accounts?.length) return [];
    const typeBalances: Record<string, number> = {};
    accounts.forEach((a) => {
      typeBalances[a.type] = (typeBalances[a.type] || 0) + Number(a.balance);
    });
    return Object.entries(typeBalances).map(([type, balance]) => ({
      name: ACCOUNT_TYPE_LABELS[type as AccountType] || type,
      value: balance,
      type,
    }));
  }, [accounts]);

  const PIE_COLORS = ['#818cf8', '#f59e0b', '#10b981', '#6366f1'];

  // ──────────────── Handlers ────────────────

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;
    const form = e.currentTarget;
    const formData = new FormData(form);

    createAccount.mutate({
      organization_id: orgId,
      name: formData.get('name') as string,
      type: formData.get('type') as AccountType,
      currency: 'USD',
      balance: Number(formData.get('initialBalance')) || 0,
    });

    form.reset();
    setShowCreateAccount(false);
  };

  const handleCreateTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId || !profile?.id) return;
    const form = e.currentTarget;
    const formData = new FormData(form);

    createTransfer.mutate({
      organization_id: orgId,
      source_account_id: formData.get('source') as string,
      destination_account_id: formData.get('destination') as string,
      amount: Number(formData.get('amount')),
      description: formData.get('description') as string,
      created_by: profile.id,
    });

    form.reset();
    setShowTransferDialog(false);
  };

  const handleApprove = (approval: ApprovalRequestWithDetails) => {
    if (!profile?.id || !orgId) return;
    if (approval.target_id) {
      approveTransfer.mutate({
        transactionId: approval.target_id,
        organizationId: orgId,
        approvedBy: profile.id,
        approvalRequestId: approval.id,
      });
    }
  };

  const handleDecline = (approval: ApprovalRequestWithDetails) => {
    if (!profile?.id || !orgId) return;
    if (approval.target_id) {
      declineTransfer.mutate({
        transactionId: approval.target_id,
        organizationId: orgId,
        declinedBy: profile.id,
        approvalRequestId: approval.id,
      });
    }
  };

  const handleExport = () => {
    if (transactions?.length) {
      exportTransactionsToCSV(transactions);
    }
  };

  // ──────────────── Render Helpers ────────────────

  const renderAccountCard = (account: TreasuryAccount) => {
    const Icon = ACCOUNT_ICONS[account.type as AccountType] || Wallet;
    const isSelected = selectedAccount?.id === account.id;

    return (
      <Card
        key={account.id}
        className={`hover:border-privium-500/30 transition-all cursor-pointer group ${
          isSelected ? 'ring-2 ring-privium-500 ring-offset-2 ring-offset-background' : ''
        }`}
        onClick={() => setSelectedAccount(isSelected ? null : account)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-privium-500/10 group-hover:bg-privium-500/20 transition-colors">
                <Icon className="h-5 w-5 text-privium-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">{account.name}</p>
                <Badge variant={ACCOUNT_TYPE_COLORS[account.type as AccountType] || 'outline'} size="sm" className="mt-1">
                  {ACCOUNT_TYPE_LABELS[account.type as AccountType] || account.type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-surface-500">
              <span className="h-2 w-2 rounded-full bg-success" />
              {account.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-100">{formatCurrency(Number(account.balance))}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-surface-500">{account.currency}</span>
            <span className="text-xs text-surface-500">Created {formatDate(account.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTransactionRow = (tx: TransactionWithAccounts) => {
    const isInflow = tx.type === 'deposit' || tx.type === 'transfer';

    return (
      <div
        key={tx.id}
        className="flex items-center justify-between py-3 border-b border-surface-800 last:border-0 hover:bg-surface-800/30 px-2 -mx-2 rounded-lg transition-colors cursor-pointer"
        onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isInflow ? 'bg-success/10' : 'bg-danger/10'
          }`}>
            {isInflow ? (
              <ArrowUpRight className="h-4 w-4 text-success" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-danger" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-200 truncate">
              {tx.description || `${tx.source_account?.name || 'External'} → ${tx.destination_account?.name || 'External'}`}
            </p>
            <p className="text-xs text-surface-500">
              {tx.source_account?.name || 'External'} → {tx.destination_account?.name || 'External'}
              <span className="mx-1">·</span>
              {formatRelativeTime(tx.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-sm font-semibold ${
            isInflow ? 'text-success' : 'text-danger'
          }`}>
            {isInflow ? '+' : '-'}{formatCurrency(Number(tx.amount))}
          </span>
          <Badge variant={TRANSACTION_STATUS_COLORS[tx.status] || 'outline'} size="sm">
            {TRANSACTION_STATUS_LABELS[tx.status] || tx.status}
          </Badge>
        </div>
      </div>
    );
  };

  const renderApprovalCard = (approval: ApprovalRequestWithDetails) => {
    const metadata = approval.metadata as Record<string, any> | undefined;
    const isPending = approval.status === 'pending';

    return (
      <Card key={approval.id} className={`border-l-4 ${isPending ? 'border-l-warning' : approval.status === 'approved' ? 'border-l-success' : 'border-l-danger'}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isPending ? 'bg-warning/10' : approval.status === 'approved' ? 'bg-success/10' : 'bg-danger/10'
              }`}>
                {isPending ? (
                  <Clock className="h-5 w-5 text-warning" />
                ) : approval.status === 'approved' ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-danger" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-surface-200">
                    {approval.request_type === 'transfer' ? 'Transfer Approval' : approval.request_type}
                  </p>
                  <Badge variant={isPending ? 'warning' : approval.status === 'approved' ? 'success' : 'danger'} size="sm">
                    {approval.status}
                  </Badge>
                </div>
                {metadata && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-surface-400">
                      Amount: <span className="text-surface-300 font-medium">{formatCurrency(Number(metadata.amount))}</span>
                    </p>
                    <p className="text-xs text-surface-400">
                      From: <span className="text-surface-300">{metadata.source_name || metadata.source_account_id}</span>
                    </p>
                  </div>
                )}
                <p className="mt-1 text-xs text-surface-500">
                  Requested by {approval.requester_profile?.full_name || approval.requester_profile?.email || 'Unknown'}
                  <span className="mx-1">·</span>
                  {formatRelativeTime(approval.created_at)}
                </p>
              </div>
            </div>
            {isPending && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-danger border-danger/30 hover:bg-danger/10"
                  onClick={() => handleDecline(approval)}
                  disabled={declineTransfer.isPending}
                >
                  <Ban className="h-3.5 w-3.5 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(approval)}
                  disabled={approveTransfer.isPending}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Approve
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ──────────────── Main Render ────────────────

  const renderContent = () => {
    if (accountsLoading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
          <div className="h-80">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </div>
      );
    }

    if (!accounts?.length) {
      // Empty state
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-privium-500/10 mb-6">
            <Wallet className="h-10 w-10 text-privium-400" />
          </div>
          <h2 className="text-xl font-semibold text-surface-100 mb-2">No treasury accounts yet</h2>
          <p className="text-sm text-surface-500 text-center max-w-md mb-8">
            Create your first treasury account to start managing your organization's funds. 
            You can set up Operating, Reserve, Payroll, or Treasury accounts.
          </p>
          <Button onClick={() => setShowCreateAccount(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Account
          </Button>
        </div>
      );
    }

    switch (view) {
      case 'transactions':
        return renderTransactionsView();
      case 'approvals':
        return renderApprovalsView();
      case 'policies':
        return renderPoliciesView();
      default:
        return renderDashboardView();
    }
  };

  // ──────────────── Dashboard View ────────────────

  const renderDashboardView = () => (
    <>
      {/* Total Balance Header */}
      <Card className="bg-gradient-to-br from-privium-500/10 via-privium-500/5 to-transparent border-privium-500/20 mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-surface-400 mb-1">Total Treasury Balance</p>
              <p className="text-3xl font-bold text-surface-100">{formatCurrency(totalBalance)}</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Across {accounts?.length || 0} accounts</span>
                </span>
                <span className="text-xs text-surface-500">
                  {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!transactions?.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/treasury?view=transactions'}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-surface-300">Treasury Accounts</h3>
        <Button size="sm" onClick={() => setShowCreateAccount(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Account
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {accounts?.map(renderAccountCard)}
      </div>

      {/* Selected Account Detail */}
      {selectedAccount && (
        <Card className="mb-6 border-privium-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedAccount.name}</CardTitle>
              <CardDescription>
                {ACCOUNT_TYPE_LABELS[selectedAccount.type as AccountType]} account · {selectedAccount.currency}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedAccount(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-surface-800/50 p-4">
                <p className="text-xs text-surface-500 mb-1">Current Balance</p>
                <p className="text-lg font-bold text-surface-100">{formatCurrency(Number(selectedAccount.balance))}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-4">
                <p className="text-xs text-surface-500 mb-1">Account Type</p>
                <Badge variant={ACCOUNT_TYPE_COLORS[selectedAccount.type as AccountType]}>{ACCOUNT_TYPE_LABELS[selectedAccount.type as AccountType]}</Badge>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-4">
                <p className="text-xs text-surface-500 mb-1">Created</p>
                <p className="text-sm font-medium text-surface-200">{formatDate(selectedAccount.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts & Activity */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Balance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Balance Trends</CardTitle>
              <CardDescription>Consolidated balance over time</CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-0.5">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    chartRange === range
                      ? 'bg-privium-500 text-white'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(51 65 85)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgb(100 116 139)"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                      stroke="rgb(100 116 139)"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Balance"
                      stroke="#818cf8"
                      fill="url(#balanceGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-surface-500">No data for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Account Distribution</CardTitle>
            <CardDescription>Balance by account type</CardDescription>
          </CardHeader>
          <CardContent>
            {accountDistribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {accountDistribution.map((entry, index) => (
                        <Cell key={entry.type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-surface-400">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-surface-500">No accounts to display</p>
              </div>
            )}
            <div className="mt-4 space-y-2 border-t border-surface-800 pt-4">
              {accountDistribution.map((item, i) => (
                <div key={item.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-surface-400">{item.name}</span>
                  </div>
                  <span className="text-surface-200 font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transfers + Pending Approvals */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transfers</CardTitle>
              <CardDescription>Latest treasury movements</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView('transactions')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {txsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions?.length ? (
              <div className="space-y-1">
                {transactions.slice(0, 5).map(renderTransactionRow)}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <ArrowRightLeft className="h-8 w-8 text-surface-600 mb-2" />
                <p className="text-sm text-surface-500">No transfers yet</p>
                <p className="text-xs text-surface-600 mt-1">Create a transfer to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                {pendingApprovals.length} transfer{pendingApprovals.length !== 1 ? 's' : ''} awaiting approval
              </CardDescription>
            </div>
            {pendingApprovals.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setView('approvals')}>
                View all
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {approvalsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 3).map(renderApprovalCard)}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                <p className="text-sm text-surface-500">All approvals up to date</p>
                <p className="text-xs text-surface-600 mt-1">No pending transfers to review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  // ──────────────── Transactions View ────────────────

  const renderTransactionsView = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setView('dashboard'); setSelectedTx(null); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Transaction History</h2>
            <p className="text-sm text-surface-500">Search and filter all treasury transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!transactions?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowTransferDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-transparent pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-privium-500 focus:outline-none focus:ring-1 focus:ring-privium-500 transition-colors"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'payment', label: 'Payment' },
                { value: 'deposit', label: 'Deposit' },
                { value: 'withdrawal', label: 'Withdrawal' },
              ]}
              className="w-36"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'declined', label: 'Declined' },
              ]}
              className="w-36"
            />
            {(searchQuery || typeFilter || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter(''); }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardContent className="p-6">
          {txsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : transactions?.length ? (
            <div className="divide-y divide-surface-800">
              {transactions.map(renderTransactionRow)}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12">
              <History className="h-12 w-12 text-surface-700 mb-4" />
              <h3 className="text-base font-medium text-surface-300 mb-1">No transactions found</h3>
              <p className="text-sm text-surface-500 mb-6">
                {searchQuery || typeFilter || statusFilter
                  ? 'Try adjusting your search or filter criteria'
                  : 'No transactions have been made yet'}
              </p>
              <Button onClick={() => setShowTransferDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Transfer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Transaction Detail */}
      {selectedTx && (
        <Dialog open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction Details">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                selectedTx.type === 'deposit' || selectedTx.type === 'transfer' ? 'bg-success/10' : 'bg-danger/10'
              }`}>
                {selectedTx.type === 'deposit' || selectedTx.type === 'transfer' ? (
                  <ArrowUpRight className="h-6 w-6 text-success" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-danger" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-surface-100">
                  {selectedTx.type === 'deposit' ? '+' : '-'}{formatCurrency(Number(selectedTx.amount))}
                </p>
                <Badge variant={TRANSACTION_STATUS_COLORS[selectedTx.status]}>
                  {TRANSACTION_STATUS_LABELS[selectedTx.status]}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">From</p>
                <p className="text-sm font-medium text-surface-200">{selectedTx.source_account?.name || 'External'}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">To</p>
                <p className="text-sm font-medium text-surface-200">{selectedTx.destination_account?.name || 'External'}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">Type</p>
                <p className="text-sm font-medium text-surface-200 capitalize">{selectedTx.type}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">Currency</p>
                <p className="text-sm font-medium text-surface-200">{selectedTx.currency}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">Created</p>
                <p className="text-sm font-medium text-surface-200">{formatDate(selectedTx.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">Created By</p>
                <p className="text-sm font-medium text-surface-200">{selectedTx.creator_profile?.full_name || selectedTx.creator_profile?.email || 'Unknown'}</p>
              </div>
            </div>

            {selectedTx.description && (
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">Description</p>
                <p className="text-sm text-surface-200">{selectedTx.description}</p>
              </div>
            )}

            {selectedTx.tx_hash && (
              <div className="rounded-lg bg-surface-800/50 p-3">
                <p className="text-xs text-surface-500 mb-1">Transaction Hash</p>
                <p className="text-sm font-mono text-privium-400">{selectedTx.tx_hash}</p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );

  // ──────────────── Approvals View ────────────────

  const renderApprovalsView = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Approval Workflow</h2>
            <p className="text-sm text-surface-500">Review and manage pending transfer approvals</p>
          </div>
        </div>
        <Badge variant="warning" size="lg">
          {pendingApprovals.length} pending
        </Badge>
      </div>

      {approvalsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : approvals?.length ? (
        <div className="space-y-4">
          {approvals.map(renderApprovalCard)}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16">
          <CheckCircle2 className="h-16 w-16 text-success mb-4" />
          <h3 className="text-lg font-medium text-surface-200 mb-1">All caught up</h3>
          <p className="text-sm text-surface-500">No approval requests at this time</p>
        </div>
      )}
    </>
  );

  // ──────────────── Policies View ────────────────

  const renderPoliciesView = () => {
    const defaultPolicies = [
      {
        id: '1',
        name: 'Auto-approval Threshold',
        description: 'Transfers under this amount are automatically approved and completed immediately.',
        min_amount: 0,
        max_amount: 10000,
        requires_approval: false,
        approver_roles: [],
        auto_approve_threshold: 10000,
      },
      {
        id: '2',
        name: 'Manager Approval',
        description: 'Transfers between $10,000 and $50,000 require manager or finance role approval.',
        min_amount: 10000,
        max_amount: 50000,
        requires_approval: true,
        approver_roles: ['manager', 'finance', 'admin'],
        auto_approve_threshold: 10000,
      },
      {
        id: '3',
        name: 'Admin Approval',
        description: 'Transfers exceeding $50,000 require admin approval with multi-signature.',
        min_amount: 50000,
        max_amount: null,
        requires_approval: true,
        approver_roles: ['admin'],
        auto_approve_threshold: 10000,
      },
    ];

    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Treasury Policies</h2>
              <p className="text-sm text-surface-500">Spending limits, approval thresholds, and rules</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {defaultPolicies.map((policy) => (
            <Card key={policy.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-privium-500/10">
                      <Shield className="h-5 w-5 text-privium-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-surface-200">{policy.name}</h3>
                      <p className="text-sm text-surface-500 mt-1">{policy.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="text-xs">
                          <span className="text-surface-500">Range: </span>
                          <span className="text-surface-300 font-medium">
                            {formatCurrency(policy.min_amount)}
                            {policy.max_amount ? ` — ${formatCurrency(policy.max_amount)}` : '+'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-surface-500">Approval: </span>
                          <Badge variant={policy.requires_approval ? 'warning' : 'success'} size="sm">
                            {policy.requires_approval ? 'Required' : 'Auto-approved'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {policy.approver_roles.map((role) => (
                      <Badge key={role} variant="outline" size="sm">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  };

  // ──────────────── Create Account Dialog ────────────────

  const renderCreateAccountDialog = () => (
    <Dialog
      open={showCreateAccount}
      onClose={() => setShowCreateAccount(false)}
      title="Create Treasury Account"
      description="Add a new account to manage your organization's funds"
    >
      <form onSubmit={handleCreateAccount} className="space-y-4">
        <Input
          label="Account Name"
          name="name"
          placeholder="e.g. Main Operating Account"
          required
        />
        <Select
          label="Account Type"
          name="type"
          required
          defaultValue="operating"
          options={[
            { value: 'operating', label: 'Operating — Day-to-day operations' },
            { value: 'reserve', label: 'Reserve — Reserved funds' },
            { value: 'payroll', label: 'Payroll — Payroll funding' },
            { value: 'treasury', label: 'Treasury — Long-term holdings' },
          ]}
        />
        <Input
          label="Initial Balance (USD)"
          name="initialBalance"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
        />
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setShowCreateAccount(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createAccount.isPending}>
            {createAccount.isPending ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Dialog>
  );

  // ──────────────── Transfer Dialog ────────────────

  const renderTransferDialog = () => (
    <Dialog
      open={showTransferDialog}
      onClose={() => setShowTransferDialog(false)}
      title="New Transfer"
      description="Move funds between treasury accounts"
    >
      <form onSubmit={handleCreateTransfer} className="space-y-4">
        <Select
          label="From Account"
          name="source"
          required
          placeholder="Select source account"
          options={(accounts || []).map((a) => ({
            value: a.id,
            label: `${a.name} — ${formatCurrency(Number(a.balance))}`,
          }))}
        />
        <Select
          label="To Account"
          name="destination"
          required
          placeholder="Select destination account"
          options={(accounts || []).map((a) => ({
            value: a.id,
            label: `${a.name} — ${formatCurrency(Number(a.balance))}`,
          }))}
        />
        <Input
          label="Amount (USD)"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          required
        />
        <Input
          label="Description (optional)"
          name="description"
          placeholder="e.g. Monthly payroll funding"
        />
        <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-warning">Transfer Policy</p>
              <p className="text-xs text-surface-500 mt-1">
                Transfers over $10,000 require approval from a manager or admin. 
                The amount will be deducted from the source account immediately 
                and credited upon approval.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTransfer.isPending}>
            {createTransfer.isPending ? 'Processing...' : 'Initiate Transfer'}
          </Button>
        </div>
      </form>
    </Dialog>
  );

  // ──────────────── Navigation Tabs ────────────────

  const renderNavTabs = () => (
    <div className="flex items-center gap-1 bg-surface-800/50 rounded-lg p-1 mb-6">
      {[
        { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: Wallet },
        { id: 'transactions' as ViewMode, label: 'Transactions', icon: ArrowRightLeft },
        { id: 'approvals' as ViewMode, label: 'Approvals', icon: Shield, badge: pendingApprovals.length },
        { id: 'policies' as ViewMode, label: 'Policies', icon: FileText },
      ].map((tab) => {
        const Icon = tab.icon;
        const isActive = view === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-surface-900 text-surface-100 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-medium text-warning">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <AppShell title="Treasury">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-surface-500">Manage your treasury accounts, liquidity, and transfers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView('policies')}>
            <Shield className="h-4 w-4 mr-2" />
            Policies
          </Button>
          <Button size="sm" onClick={() => setShowTransferDialog(true)} disabled={!accounts?.length}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
          <Button size="sm" onClick={() => setShowCreateAccount(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {accounts?.length ? renderNavTabs() : null}

      {renderContent()}

      {/* Dialogs */}
      {renderCreateAccountDialog()}
      {renderTransferDialog()}
    </AppShell>
  );
}