import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

// ──────────────── Types ────────────────

export type Organization = Tables<'organizations'>;
export type OrganizationMember = Tables<'organization_members'>;
export type Department = Tables<'departments'>;
export type Invitation = Tables<'invitations'>;

export interface MemberWithProfile extends OrganizationMember {
  profile: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface InvitationWithDetails extends Invitation {
  invited_by_profile: {
    full_name: string | null;
    email: string;
  } | null;
}

export type OrgRole = 'admin' | 'manager' | 'finance' | 'member' | 'viewer';

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  finance: 2,
  manager: 3,
  admin: 4,
};

export const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  finance: 'Finance',
  member: 'Member',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  admin: 'Full access. Manage members, configure org, approve all actions.',
  manager: 'Create transfers, manage payroll, approve within limits.',
  finance: 'Full treasury + payroll access. No org administration.',
  member: 'View dashboards, submit requests, view own data.',
  viewer: 'Read-only access to dashboards and reports.',
};

export const ROLE_COLORS: Record<OrgRole, 'default' | 'success' | 'warning' | 'info' | 'outline'> = {
  admin: 'default',
  manager: 'warning',
  finance: 'success',
  member: 'info',
  viewer: 'outline',
};

export const PERMISSION_MATRIX: { action: string; roles: OrgRole[] }[] = [
  { action: 'View Dashboard', roles: ['viewer', 'member', 'finance', 'manager', 'admin'] },
  { action: 'View Reports', roles: ['viewer', 'member', 'finance', 'manager', 'admin'] },
  { action: 'View Treasury', roles: ['viewer', 'member', 'finance', 'manager', 'admin'] },
  { action: 'Create Transactions', roles: ['member', 'finance', 'manager', 'admin'] },
  { action: 'Approve Transactions', roles: ['finance', 'manager', 'admin'] },
  { action: 'View Payroll', roles: ['viewer', 'member', 'finance', 'manager', 'admin'] },
  { action: 'Manage Payroll', roles: ['finance', 'manager', 'admin'] },
  { action: 'Manage Employees', roles: ['manager', 'admin'] },
  { action: 'Manage Departments', roles: ['manager', 'admin'] },
  { action: 'Invite Members', roles: ['manager', 'admin'] },
  { action: 'Change Roles', roles: ['admin'] },
  { action: 'Manage Org Settings', roles: ['admin'] },
  { action: 'Configure Policies', roles: ['admin'] },
  { action: 'View Audit Logs', roles: ['admin'] },
];

// ──────────────── Query Keys ────────────────

export const orgKeys = {
  all: ['organizations'] as const,
  list: () => [...orgKeys.all, 'list'] as const,
  detail: (id: string) => [...orgKeys.all, 'detail', id] as const,
  members: (id: string) => [...orgKeys.all, 'members', id] as const,
  departments: (id: string) => [...orgKeys.all, 'departments', id] as const,
  invitations: (id: string) => [...orgKeys.all, 'invitations', id] as const,
};

// ──────────────── Hooks ────────────────

export function useMyOrganizations() {
  return useQuery({
    queryKey: orgKeys.list(),
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true);

      if (error) throw error;
      if (!memberships?.length) return [];

      const ids = memberships.map((m) => m.organization_id);
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', ids)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      return orgs as Organization[];
    },
  });
}

export function useOrganization(orgId: string | undefined) {
  return useQuery({
    queryKey: orgKeys.detail(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      return data as Organization;
    },
    enabled: !!orgId,
  });
}

export function useOrganizationMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: orgKeys.members(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, profile:profiles(full_name, email, avatar_url)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as MemberWithProfile[];
    },
    enabled: !!orgId,
  });
}

export function useDepartments(orgId: string | undefined) {
  return useQuery({
    queryKey: orgKeys.departments(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!orgId,
  });
}

export function useInvitations(orgId: string | undefined) {
  return useQuery({
    queryKey: orgKeys.invitations(orgId ?? ''),
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('invitations')
        .select('*, invited_by_profile:profiles!invited_by(full_name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as InvitationWithDetails[];
    },
    enabled: !!orgId,
  });
}

export function useUserRole(orgId: string | undefined) {
  return useQuery({
    queryKey: [...orgKeys.all, 'my-role', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.role as OrgRole | null;
    },
    enabled: !!orgId,
  });
}

// ──────────────── Mutations ────────────────

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      slug: string;
      industry?: string;
      size?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: input.name,
          slug: input.slug,
          settings: { industry: input.industry || '', size: input.size || '' },
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'admin',
          is_active: true,
        });

      if (memberError) throw memberError;

      return org as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.list() });
      toast.success('Organization created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create organization');
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'organizations'> & { id: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Organization;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: orgKeys.list() });
      toast.success('Organization updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update organization');
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      orgId,
      role,
    }: {
      memberId: string;
      orgId: string;
      role: OrgRole;
    }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(variables.orgId) });
      toast.success('Role updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update role');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, orgId }: { memberId: string; orgId: string }) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(variables.orgId) });
      toast.success('Member removed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove member');
    },
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      email,
      role,
    }: {
      orgId: string;
      email: string;
      role: OrgRole;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          email,
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // In a real app, trigger an email sending Edge Function here
      // For now, log the invitation token for demo purposes
      console.log('Invitation sent:', data.token);

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.invitations(variables.orgId) });
      toast.success(`Invitation sent to ${variables.email}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send invitation');
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, orgId }: { invitationId: string; orgId: string }) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.invitations(variables.orgId) });
      toast.success('Invitation cancelled');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to cancel invitation');
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      name,
    }: {
      orgId: string;
      name: string;
    }) => {
      const { data, error } = await supabase
        .from('departments')
        .insert({ organization_id: orgId, name })
        .select()
        .single();

      if (error) throw error;
      return data as Department;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.departments(variables.orgId) });
      toast.success('Department created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create department');
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      orgId,
      name,
    }: {
      id: string;
      orgId: string;
      name: string;
    }) => {
      const { error } = await supabase
        .from('departments')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.departments(variables.orgId) });
      toast.success('Department updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update department');
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.departments(variables.orgId) });
      toast.success('Department deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete department');
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (findError) throw new Error('Invalid or expired invitation');
      if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation has expired');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in');

      // Add as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
          is_active: true,
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.list() });
      toast.success('You have joined the organization!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to accept invitation');
    },
  });
}