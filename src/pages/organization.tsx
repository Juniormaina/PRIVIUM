import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar } from '../components/ui/avatar';
import { Skeleton } from '../components/ui/skeleton';
import { OnboardingChecklist } from '../components/organization/onboarding-checklist';
import { InviteDialog } from '../components/organization/invite-dialog';
import { DepartmentDialog } from '../components/organization/department-dialog';
import { RoleBadge } from '../components/organization/role-badge';
import { useOrganization } from '../providers/organization-provider';
import {
  Building2,
  Plus,
  Users,
  Settings as SettingsIcon,
  Shield,
  Key,
  Mail,
  UserPlus,
  ChevronRight,
  Trash2,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function OrganizationPage() {
  const navigate = useNavigate();
  const {
    currentOrganization,
    isOrgLoading,
    members,
    areMembersLoading,
    departments,
    isAdmin,
    userRole,
    updateMemberRole,
    removeMember,
    invitations,
    areInvitationsLoading,
    cancelInvitation,
  } = useOrganization();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);

  const orgName = currentOrganization?.name ?? 'Organization';
  const orgSettings = currentOrganization?.settings as Record<string, string> | undefined;
  const createdAt = currentOrganization?.created_at
    ? new Date(currentOrganization.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const activeMembers = members.filter((m) => m.is_active);
  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  return (
    <AppShell title="Organization">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500">Manage your organization, members, and permissions</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Members
            </Button>
          )}
        </div>

        {/* Onboarding checklist */}
        <OnboardingChecklist />

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Organization Info + Members */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Overview</CardTitle>
                <CardDescription>Your enterprise account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isOrgLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </div>
                ) : (
                  <>
                    {/* Org identity */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-privium-500/10">
                        <Building2 className="h-8 w-8 text-privium-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-surface-100">{orgName}</h3>
                        <p className="text-sm text-surface-500">
                          {orgSettings?.industry
                            ? `${orgSettings.industry.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`
                            : 'Organization'}
                          {createdAt && ` · Created ${createdAt}`}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {currentOrganization?.is_active !== false && (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-medium text-success">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 rounded-lg bg-surface-800/50 p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-surface-100">{activeMembers.length}</p>
                        <p className="text-xs text-surface-500">Members</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-surface-100">{departments.length}</p>
                        <p className="text-xs text-surface-500">Departments</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-surface-100">{pendingInvitations.length}</p>
                        <p className="text-xs text-surface-500">Pending Invites</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-surface-200">Team Members</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowInviteDialog(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>

                  {areMembersLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : activeMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-surface-800">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800 mb-2">
                        <Users className="h-5 w-5 text-surface-500" />
                      </div>
                      <p className="text-sm font-medium text-surface-400">No members yet</p>
                      <p className="text-xs text-surface-600 mt-1">Invite your team to get started.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowInviteDialog(true)}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Invite Members
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activeMembers.map((member) => {
                        const profile = member.profile;
                        const name = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';
                        const email = profile?.email || '';
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-800/30 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                name={name}
                                size="sm"
                                src={profile?.avatar_url ?? undefined}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-surface-200 truncate">{name}</p>
                                <p className="text-xs text-surface-500 truncate">{email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <RoleBadge
                                role={member.role as 'admin' | 'manager' | 'finance' | 'member' | 'viewer'}
                                memberId={member.id}
                                onChangeRole={(newRole) => {
                                  updateMemberRole.mutate({
                                    memberId: member.id,
                                    orgId: member.organization_id,
                                    role: newRole,
                                  });
                                }}
                                isCurrentUser={false}
                              />
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${name} from the organization?`)) {
                                      removeMember.mutate({
                                        memberId: member.id,
                                        orgId: member.organization_id,
                                      });
                                    }
                                  }}
                                  className="rounded-lg p-1.5 text-surface-600 opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10 transition-all"
                                  aria-label={`Remove ${name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-surface-500" />
                      <CardTitle className="text-sm">Pending Invitations</CardTitle>
                    </div>
                    <span className="rounded-full bg-surface-800 px-2 py-0.5 text-[10px] font-medium text-surface-400">
                      {pendingInvitations.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingInvitations.map((inv) => {
                      const inviter = inv.invited_by_profile;
                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between rounded-lg border border-surface-800 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-800">
                              <Mail className="h-4 w-4 text-surface-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-surface-200 truncate">{inv.email}</p>
                              <p className="text-xs text-surface-500">
                                Role: {inv.role} · Invited by {inviter?.full_name || inviter?.email || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                cancelInvitation.mutate({
                                  invitationId: inv.id,
                                  orgId: inv.organization_id,
                                });
                              }}
                              className="rounded-lg p-1.5 text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors"
                              aria-label="Cancel invitation"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <button
                  onClick={() => setShowDepartments(!showDepartments)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800/50 hover:text-surface-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-surface-500" />
                    Departments
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-surface-600 transition-transform', showDepartments && 'rotate-90')} />
                </button>

                <button
                  onClick={() => navigate('/admin')}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800/50 hover:text-surface-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-surface-500" />
                    Roles & Permissions
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-600" />
                </button>

                <button
                  onClick={() => setShowInviteDialog(true)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800/50 hover:text-surface-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="h-4 w-4 text-surface-500" />
                    Invite Members
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-600" />
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800/50 hover:text-surface-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SettingsIcon className="h-4 w-4 text-surface-500" />
                    General Settings
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-600" />
                </button>

                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-surface-300 hover:bg-surface-800/50 hover:text-surface-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-surface-500" />
                      API Keys
                    </div>
                    <ChevronRight className="h-4 w-4 text-surface-600" />
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Departments Panel */}
            {showDepartments && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Departments</CardTitle>
                    {isAdmin && <DepartmentDialog />}
                  </div>
                </CardHeader>
                <CardContent>
                  <DepartmentDialog />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <InviteDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
    </AppShell>
  );
}