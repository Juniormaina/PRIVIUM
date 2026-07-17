import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  useMyOrganizations,
  useOrganization as useOrganizationQuery,
  useOrganizationMembers,
  useUserRole,
  useCreateOrganization,
  useUpdateOrganization,
  useUpdateMemberRole,
  useRemoveMember,
  useSendInvitation,
  useCancelInvitation,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useAcceptInvitation,
  useDepartments,
  useInvitations,
  type Organization,
  type OrgRole,
  type MemberWithProfile,
  type Department,
  type InvitationWithDetails,
  ROLE_HIERARCHY,
} from '../hooks/use-organization';
import { useAuth } from './auth-provider';

interface OrganizationContextValue {
  // Current org state
  currentOrgId: string | null;
  setCurrentOrgId: (id: string | null) => void;

  // Data
  organizations: Organization[];
  isOrgsLoading: boolean;
  currentOrganization: Organization | null;
  isOrgLoading: boolean;
  members: MemberWithProfile[];
  areMembersLoading: boolean;
  departments: Department[];
  areDepartmentsLoading: boolean;
  invitations: InvitationWithDetails[];
  areInvitationsLoading: boolean;
  userRole: OrgRole | null;
  isRoleLoading: boolean;

  // Permissions helpers
  hasPermission: (minRole: OrgRole) => boolean;
  isAdmin: boolean;
  isManager: boolean;

  // Mutations
  createOrganization: ReturnType<typeof useCreateOrganization>;
  updateOrganization: ReturnType<typeof useUpdateOrganization>;
  updateMemberRole: ReturnType<typeof useUpdateMemberRole>;
  removeMember: ReturnType<typeof useRemoveMember>;
  sendInvitation: ReturnType<typeof useSendInvitation>;
  cancelInvitation: ReturnType<typeof useCancelInvitation>;
  createDepartment: ReturnType<typeof useCreateDepartment>;
  updateDepartment: ReturnType<typeof useUpdateDepartment>;
  deleteDepartment: ReturnType<typeof useDeleteDepartment>;
  acceptInvitation: ReturnType<typeof useAcceptInvitation>;

  // Onboarding
  onboardingComplete: boolean;
  markOnboardingComplete: () => void;

  // Org creation wizard
  showCreateOrg: boolean;
  setShowCreateOrg: (show: boolean) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentOrgId, setCurrentOrgId_] = useState<string | null>(() => {
    return localStorage.getItem('currentOrgId');
  });
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [onboardingComplete, setOnboardingComplete_] = useState(() => {
    return localStorage.getItem('orgOnboardingComplete') === 'true';
  });

  const setCurrentOrgId = useCallback((id: string | null) => {
    setCurrentOrgId_(id);
    if (id) localStorage.setItem('currentOrgId', id);
    else localStorage.removeItem('currentOrgId');
  }, []);

  // Queries
  const { data: organizations = [], isLoading: isOrgsLoading } = useMyOrganizations();
  const { data: currentOrganization = null, isLoading: isOrgLoading } = useOrganizationQuery(currentOrgId ?? undefined);
  const { data: members = [], isLoading: areMembersLoading } = useOrganizationMembers(currentOrgId ?? undefined);
  const { data: departments = [], isLoading: areDepartmentsLoading } = useDepartments(currentOrgId ?? undefined);
  const { data: invitations = [], isLoading: areInvitationsLoading } = useInvitations(currentOrgId ?? undefined);
  const { data: userRole = null, isLoading: isRoleLoading } = useUserRole(currentOrgId ?? undefined);

  // Auto-set first org
  useEffect(() => {
    if (organizations.length > 0 && !currentOrgId) {
      setCurrentOrgId(organizations[0].id);
    }
  }, [organizations, currentOrgId, setCurrentOrgId]);

  // Mutations
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const sendInvitation = useSendInvitation();
  const cancelInvitation = useCancelInvitation();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const acceptInvitation = useAcceptInvitation();

  // Permissions helpers
  const hasPermission = useCallback(
    (minRole: OrgRole): boolean => {
      if (!userRole) return false;
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
    },
    [userRole]
  );

  const isAdmin = userRole === 'admin';
  const isManager = isAdmin || userRole === 'manager';

  const markOnboardingComplete = useCallback(() => {
    setOnboardingComplete_(true);
    localStorage.setItem('orgOnboardingComplete', 'true');
  }, []);

  const value: OrganizationContextValue = {
    currentOrgId,
    setCurrentOrgId,
    organizations,
    isOrgsLoading,
    currentOrganization,
    isOrgLoading,
    members,
    areMembersLoading,
    departments,
    areDepartmentsLoading,
    invitations,
    areInvitationsLoading,
    userRole,
    isRoleLoading,
    hasPermission,
    isAdmin,
    isManager,
    createOrganization,
    updateOrganization,
    updateMemberRole,
    removeMember,
    sendInvitation,
    cancelInvitation,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    acceptInvitation,
    onboardingComplete,
    markOnboardingComplete,
    showCreateOrg,
    setShowCreateOrg,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return ctx;
}