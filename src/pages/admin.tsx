import { useState, useCallback } from 'react';
import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import { useOrganization } from '../providers/organization-provider';
import {
  useAdminOrganizations,
  useAdminUsers,
  useSystemHealth,
  usePlatformMetrics,
  useToggleOrganizationStatus,
  type AdminUserWithOrgs,
} from '../hooks/use-admin';
import {
  useAuditLogs,
  useExportAuditLogs,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  ACTION_LABELS,
  RESOURCE_LABELS,
  type AuditLogFilters,
  type AuditLogWithProfile,
} from '../hooks/use-audit-logs';
import { cn, formatCurrency, formatDate, formatRelativeTime } from '../lib/utils';
import {
  Shield,
  Activity,
  Users as UsersIcon,
  Database,
  Globe,
  FileText,
  Server,
  Lock,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Loader2,
  Filter,
  X,
  Building2,
  DollarSign,
  Clock,
  UserCheck,
  Check,
  Eye,
  UserPlus,
  UserMinus,
  Play,
  Pause,
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'audit-log' | 'activity' | 'health';

const TABS: { id: AdminTab; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'audit-log', label: 'Audit Log', icon: FileText },
  { id: 'activity', label: 'Activity Timeline', icon: Clock },
  { id: 'health', label: 'System Health', icon: Server },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    document.getElementById(`admin-tab-${TABS[nextIndex].id}`)?.focus();
  };

  return (
    <AppShell title="Admin">
      <div className="space-y-6">
        {/* Tab navigation */}
        <nav
          role="tablist"
          aria-label="Admin sections"
          className="flex gap-1 overflow-x-auto border-b border-border pb-px"
        >
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`admin-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-privium-500',
                  isActive
                    ? 'text-privium-400 border-b-2 border-privium-500'
                    : 'text-surface-400 hover:text-surface-200 border-b-2 border-transparent'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Panels */}
        <div>
          {/* OVERVIEW PANEL */}
          <div
            role="tabpanel"
            id="admin-panel-overview"
            aria-labelledby="admin-tab-overview"
            hidden={activeTab !== 'overview'}
          >
            {activeTab === 'overview' && <AdminOverview />}
          </div>

          {/* USERS PANEL */}
          <div
            role="tabpanel"
            id="admin-panel-users"
            aria-labelledby="admin-tab-users"
            hidden={activeTab !== 'users'}
          >
            {activeTab === 'users' && <AdminUsers />}
          </div>

          {/* AUDIT LOG PANEL */}
          <div
            role="tabpanel"
            id="admin-panel-audit-log"
            aria-labelledby="admin-tab-audit-log"
            hidden={activeTab !== 'audit-log'}
          >
            {activeTab === 'audit-log' && <AdminAuditLog />}
          </div>

          {/* ACTIVITY TIMELINE PANEL */}
          <div
            role="tabpanel"
            id="admin-panel-activity"
            aria-labelledby="admin-tab-activity"
            hidden={activeTab !== 'activity'}
          >
            {activeTab === 'activity' && <AdminActivityTimeline />}
          </div>

          {/* SYSTEM HEALTH PANEL */}
          <div
            role="tabpanel"
            id="admin-panel-health"
            aria-labelledby="admin-tab-health"
            hidden={activeTab !== 'health'}
          >
            {activeTab === 'health' && <AdminSystemHealth />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ──────────────── OVERVIEW TAB ────────────────

function AdminOverview() {
  const { data: metrics, isLoading: metricsLoading } = usePlatformMetrics();
  const { data: orgs = [], isLoading: orgsLoading } = useAdminOrganizations();

  if (metricsLoading || orgsLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Total Organizations', value: metrics?.totalOrganizations ?? 0, icon: Building2, change: '+2 this month', color: 'text-privium-400' },
    { label: 'Active Organizations', value: metrics?.activeOrganizations ?? 0, icon: CheckCircle2, change: `${Math.round(((metrics?.activeOrganizations ?? 0) / (metrics?.totalOrganizations ?? 1)) * 100)}% rate`, color: 'text-success-light' },
    { label: 'Total Users', value: metrics?.totalUsers ?? 0, icon: UserCheck, change: `${metrics?.growthRate ?? 0}% growth`, color: 'text-info-light' },
    { label: 'Total Volume', value: formatCurrency(metrics?.totalVolume ?? 0), icon: DollarSign, change: 'All time', color: 'text-accent' },
    { label: 'Transactions', value: metrics?.totalTransactions ?? 0, icon: ArrowUpRight, change: 'All time', color: 'text-privium-400' },
    { label: 'Payroll Cycles', value: metrics?.totalPayrollCycles ?? 0, icon: Clock, change: 'All time', color: 'text-warning-light' },
    { label: 'Pending Approvals', value: metrics?.pendingApprovals ?? 0, icon: AlertCircle, change: 'Needs attention', color: metrics?.pendingApprovals ? 'text-danger' : 'text-success-light' },
    { label: 'Avg. Org Size', value: metrics?.totalUsers ? Math.round(metrics.totalUsers / (metrics.totalOrganizations || 1)) : 0, icon: UsersIcon, change: 'users/org', color: 'text-surface-300' },
  ];

  return (
    <div className="grid gap-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((mc) => {
          const Icon = mc.icon;
          return (
            <div key={mc.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">{mc.label}</span>
                <Icon className={cn('h-5 w-5', mc.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{mc.value}</p>
              <p className="text-xs text-surface-500 mt-1">{mc.change}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Organizations</CardTitle>
          <CardDescription>Latest organizations to join the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.slice(0, 5).map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-privium-500/10">
                        <Building2 className="h-4 w-4 text-privium-400" />
                      </div>
                      <span className="font-medium text-foreground">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.tier === 'enterprise' ? 'default' : 'outline'} size="sm">
                      {org.tier || 'free'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.is_active ? 'success' : 'danger'} size="sm">
                      {org.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(org.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No organizations yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────── USERS TAB ────────────────

function AdminUsers() {
  const { data: users = [], isLoading } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewUser, setViewUser] = useState<AdminUserWithOrgs | null>(null);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name?.toLowerCase() || '').includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage all platform users</CardDescription>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={6} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage all platform users across organizations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-transparent pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-privium-500 focus:outline-none focus:ring-1 focus:ring-privium-500 transition-colors"
              aria-label="Search users"
            />
          </div>

          {/* Users table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organizations</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.full_name || u.email} size="sm" />
                      <span className="font-medium text-foreground">{u.full_name || 'Unnamed'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.organizations.slice(0, 2).map((org) => (
                        <Badge key={org.organization_id} variant="outline" size="sm">
                          {org.organization_name}
                        </Badge>
                      ))}
                      {u.organizations.length > 2 && (
                        <Badge variant="outline" size="sm">+{u.organizations.length - 2}</Badge>
                      )}
                      {u.organizations.length === 0 && (
                        <span className="text-xs text-muted-foreground">No orgs</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(u.created_at || '')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewUser(viewUser?.id === u.id ? null : u)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No users found</p>
                    <p className="text-xs mt-1">
                      {searchQuery ? 'Try a different search term' : 'No users have joined yet'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Detail */}
      {viewUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={viewUser.full_name || viewUser.email} size="md" />
                <div>
                  <CardTitle>{viewUser.full_name || 'Unnamed User'}</CardTitle>
                  <CardDescription>{viewUser.email}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-surface-200 mb-2">Organization Memberships</p>
              <div className="space-y-2">
                {viewUser.organizations.map((org) => (
                  <div
                    key={org.organization_id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-surface-400" />
                      <span className="text-sm text-foreground">{org.organization_name}</span>
                    </div>
                    <Badge variant="default" size="sm">{org.role}</Badge>
                  </div>
                ))}
                {viewUser.organizations.length === 0 && (
                  <p className="text-sm text-muted-foreground">Not a member of any organization</p>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Joined {formatDate(viewUser.created_at || '')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization Management */}
      <OrganizationManagement />
    </div>
  );
}

function OrganizationManagement() {
  const { data: orgs = [] } = useAdminOrganizations();
  const toggleOrgStatus = useToggleOrganizationStatus();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrgs = orgs.filter((o) =>
    !searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Management</CardTitle>
        <CardDescription>Manage all tenant organizations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-border bg-transparent pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-privium-500 focus:outline-none focus:ring-1 focus:ring-privium-500 transition-colors"
            aria-label="Search organizations"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-privium-500/10">
                      <Building2 className="h-4 w-4 text-privium-400" />
                    </div>
                    <span className="font-medium text-foreground">{org.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={org.tier === 'enterprise' ? 'default' : 'outline'} size="sm">
                    {org.tier || 'free'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={org.is_active ? 'success' : 'danger'} size="sm">
                    {org.is_active ? 'Active' : 'Suspended'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(org.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleOrgStatus.mutate({ orgId: org.id, isActive: !org.is_active })
                    }
                    disabled={toggleOrgStatus.isPending}
                    title={org.is_active ? 'Suspend organization' : 'Activate organization'}
                  >
                    {org.is_active ? (
                      <Pause className="h-4 w-4 text-warning-light" />
                    ) : (
                      <Play className="h-4 w-4 text-success-light" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredOrgs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No organizations found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ──────────────── AUDIT LOG TAB ────────────────

function AdminAuditLog() {
  const { currentOrgId } = useOrganization();
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const { data: logs = [], isLoading } = useAuditLogs(currentOrgId ?? undefined, filters);
  const exportLogs = useExportAuditLogs(currentOrgId ?? undefined);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
  }, [searchInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchInput('');
  }, []);

  const hasActiveFilters = !!filters.action || !!filters.resource || !!filters.userId || !!filters.search || !!filters.dateFrom;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Immutable record of all platform actions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-privium-500 text-[10px] text-white">
                  !
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportLogs.mutate(filters)}
              disabled={exportLogs.isPending}
            >
              {exportLogs.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-10 w-full rounded-lg border border-border bg-transparent pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-privium-500 focus:outline-none focus:ring-1 focus:ring-privium-500 transition-colors"
              aria-label="Search audit log"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="rounded-lg border border-border bg-surface-800/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-surface-200">Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-privium-400 hover:text-privium-300 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Select
                label="Action"
                value={filters.action || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value || undefined }))}
                options={[
                  { value: '', label: 'All actions' },
                  ...AUDIT_ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a] || a })),
                ]}
              />
              <Select
                label="Resource"
                value={filters.resource || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, resource: e.target.value || undefined }))}
                options={[
                  { value: '', label: 'All resources' },
                  ...AUDIT_RESOURCES.map((r) => ({ value: r, label: RESOURCE_LABELS[r] || r })),
                ]}
              />
              <Input
                label="From date"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))}
              />
              <Input
                label="To date"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined }))}
              />
            </div>
          </div>
        )}

        {/* Logs table */}
        {isLoading ? (
          <SkeletonTable rows={8} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={log.profile?.full_name || log.profile?.email || 'Unknown'}
                        size="sm"
                      />
                      <span className="text-sm text-foreground">
                        {log.profile?.full_name || log.profile?.email || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="text-surface-300">{RESOURCE_LABELS[log.resource] || log.resource}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.resource_id && <span className="font-mono">#{log.resource_id.slice(0, 8)}</span>}
                    {log.ip_address && <span className="ml-2">· {log.ip_address}</span>}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No audit logs found</p>
                    <p className="text-xs mt-1">
                      {hasActiveFilters
                        ? 'Try adjusting your filters'
                        : 'Audit log entries will appear here as actions are performed'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <div className="text-xs text-muted-foreground">
          Showing {logs.length} entries
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────── ACTIVITY TIMELINE TAB ────────────────

function AdminActivityTimeline() {
  const { currentOrgId } = useOrganization();
  const { data: logs = [], isLoading } = useAuditLogs(currentOrgId ?? undefined);

  const groupedLogs = logs.reduce<Record<string, AuditLogWithProfile[]>>((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>Chronological view of platform activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
        <CardDescription>Chronological view of all platform activity</CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No activity recorded</p>
            <p className="text-xs mt-1">Activity will appear here as actions are performed on the platform</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([date, dayLogs]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-surface-300 mb-4 sticky top-0 bg-card py-1 z-10">
                  {date}
                </h3>
                <div className="relative space-y-0">
                  {dayLogs.map((log, index) => (
                    <div key={log.id} className="flex gap-4 pb-6 relative">
                      {/* Timeline line */}
                      {index < dayLogs.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                      )}
                      {/* Dot */}
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full',
                          getActionColor(log.action)
                        )}>
                          {getActionIcon(log.action)}
                        </div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {log.profile?.full_name || log.profile?.email || 'System'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          <Badge variant="outline" size="sm">
                            {RESOURCE_LABELS[log.resource] || log.resource}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(log.created_at)}
                          {log.ip_address && <span className="ml-2">· IP: {log.ip_address}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getActionColor(action: string): string {
  switch (action) {
    case 'created':
    case 'completed':
    case 'approved':
      return 'bg-success/10 text-success-light';
    case 'deleted':
    case 'declined':
    case 'cancelled':
    case 'removed':
      return 'bg-danger/10 text-danger';
    case 'updated':
    case 'submitted':
      return 'bg-warning/10 text-warning-light';
    default:
      return 'bg-privium-500/10 text-privium-400';
  }
}

function getActionIcon(action: string): React.ReactNode {
  const className = 'h-4 w-4';
  switch (action) {
    case 'created':
      return <Check className={className} />;
    case 'updated':
      return <RefreshCw className={className} />;
    case 'deleted':
      return <XCircle className={className} />;
    case 'approved':
      return <CheckCircle2 className={className} />;
    case 'declined':
      return <XCircle className={className} />;
    case 'completed':
      return <CheckCircle2 className={className} />;
    case 'cancelled':
      return <X className={className} />;
    case 'invited':
      return <UserPlus className={className} />;
    case 'removed':
      return <UserMinus className={className} />;
    case 'signed_in':
      return <ArrowUp className={className} />;
    case 'signed_out':
      return <ArrowDown className={className} />;
    default:
      return <Activity className={className} />;
  }
}

// ──────────────── SYSTEM HEALTH TAB ────────────────

function AdminSystemHealth() {
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: metrics, isLoading: metricsLoading } = usePlatformMetrics();

  if (healthLoading || metricsLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const services = [
    { label: 'API Service', status: health?.apiStatus ?? 'operational', icon: Globe },
    { label: 'Database', status: health?.databaseStatus ?? 'healthy', icon: Database },
    { label: 'Blockchain', status: health?.blockchainStatus ?? 'synced', icon: Server },
    { label: 'Auth Service', status: health?.authStatus ?? 'operational', icon: Lock },
  ];

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'operational':
      case 'healthy':
      case 'synced':
        return 'success';
      case 'degraded':
      case 'syncing':
        return 'warning';
      case 'down':
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'operational': return 'Operational';
      case 'healthy': return 'Healthy';
      case 'synced': return 'Synced';
      case 'degraded': return 'Degraded';
      case 'syncing': return 'Syncing';
      case 'down': return 'Down';
      case 'error': return 'Error';
      default: return status;
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
      case 'synced':
        return 'bg-success';
      case 'degraded':
      case 'syncing':
        return 'bg-warning';
      case 'down':
      case 'error':
        return 'bg-danger';
      default:
        return 'bg-surface-500';
    }
  };

  return (
    <div className="grid gap-6">
      {/* Service Status */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <div key={svc.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn('flex h-2.5 w-2.5 rounded-full', getStatusDot(svc.status))} />
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">{svc.label}</span>
                </div>
                <Icon className="h-5 w-5 text-surface-400" />
              </div>
              <Badge variant={getStatusVariant(svc.status)} size="sm">
                {getStatusLabel(svc.status)}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Platform Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Metrics</CardTitle>
          <CardDescription>Key platform performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-xl font-bold text-foreground">{health?.uptime ?? 99.97}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Volume</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(metrics?.totalVolume ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Orgs</p>
              <p className="text-xl font-bold text-foreground">
                {metrics?.activeOrganizations ?? 0} / {metrics?.totalOrganizations ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-xl font-bold text-foreground">{metrics?.totalUsers ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-xl font-bold text-foreground">{metrics?.pendingApprovals ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Growth Rate</p>
              <p className="text-xl font-bold text-foreground">{metrics?.growthRate ?? 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-surface-500" />
            <CardTitle>Feature Flags</CardTitle>
          </div>
          <CardDescription>Toggle platform features across all organizations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Blockchain Transactions', description: 'Enable on-chain transaction execution', enabled: true },
            { label: 'Multi-Signature Wallets', description: 'Allow multi-sig approval workflows', enabled: true },
            { label: 'AI Assistant', description: 'Enable the Privy AI assistant', enabled: true },
            { label: 'API Access', description: 'Allow third-party API integrations', enabled: false },
            { label: 'Audit Log Export', description: 'Allow CSV export of audit logs', enabled: true },
            { label: 'Custom Branding', description: 'Allow organizations to customize branding', enabled: false },
          ].map((flag) => (
            <div key={flag.label} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-surface-200">{flag.label}</p>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
              <Badge variant={flag.enabled ? 'success' : 'outline'} size="sm">
                {flag.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}