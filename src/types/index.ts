export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'finance' | 'member' | 'viewer';
  created_at: string;
}

export interface TreasuryAccount {
  id: string;
  organization_id: string;
  name: string;
  type: 'operating' | 'reserve' | 'payroll' | 'treasury';
  balance: number;
  currency: string;
  wallet_address?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string;
  source_account_id: string;
  destination_account_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'completed' | 'failed' | 'declined';
  type: 'transfer' | 'payment' | 'deposit' | 'withdrawal';
  description?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
}

export interface PayrollEmployee {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  type: 'full_time' | 'part_time' | 'contractor' | 'intern';
  salary: number;
  currency: string;
  department?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface PayrollCycle {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'calculated' | 'approved' | 'funded' | 'completed';
  total_amount: number;
  currency: string;
  created_by: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  request_type: 'transfer' | 'payroll' | 'policy_change' | 'member_invite';
  status: 'pending' | 'approved' | 'declined';
  requested_by: string;
  approved_by?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface DashboardStats {
  total_balance: number;
  monthly_payroll: number;
  pending_approvals: number;
  active_employees: number;
  recent_transactions: Transaction[];
}