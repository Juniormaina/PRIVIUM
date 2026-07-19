import { useState, useCallback } from 'react';
import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { useTheme } from '../providers/theme-provider';
import { useAuth } from '../providers/auth-provider';
import { useOrganization } from '../providers/organization-provider';
import {
  useUpdateProfile,
  useChangePassword,
  useUpdateOrgSettings,
} from '../hooks/use-settings';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../hooks/use-notifications';
import { cn } from '../lib/utils';
import {
  Sun,
  Moon,
  Bell,
  Shield,
  Key,
  Globe,
  Palette,
  User,
  Building2,
  Smartphone,
  Mail,
  Check,
  Save,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

type SettingsTab = 'profile' | 'organization' | 'notifications' | 'security' | 'appearance';

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { theme, toggleTheme, setTheme } = useTheme();
  const { profile } = useAuth();
  const { currentOrganization, currentOrgId } = useOrganization();

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const updateOrgSettings = useUpdateOrgSettings();

  // Profile form
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Org settings form
  const [orgName, setOrgName] = useState(currentOrganization?.name || '');
  const [orgSlug, setOrgSlug] = useState(currentOrganization?.slug || '');
  const [industry, setIndustry] = useState((currentOrganization?.settings as Record<string, unknown>)?.industry as string || '');
  const [orgSize, setOrgSize] = useState((currentOrganization?.settings as Record<string, unknown>)?.size as string || '');

  // Notification preferences
  const { data: preferences = [] } = useNotificationPreferences(currentOrgId ?? undefined);
  const updatePreference = useUpdateNotificationPreference();

  const handleSaveProfile = useCallback(() => {
    updateProfile.mutate({ full_name: fullName });
  }, [updateProfile, fullName]);

  const handleChangePassword = useCallback(() => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }, [changePassword, currentPassword, newPassword, confirmPassword]);

  const handleSaveOrg = useCallback(() => {
    if (!currentOrgId) return;
    updateOrgSettings.mutate({
      orgId: currentOrgId,
      name: orgName,
      slug: orgSlug,
      settings: { industry, size: orgSize },
    });
  }, [updateOrgSettings, currentOrgId, orgName, orgSlug, industry, orgSize]);

  const getPref = (type: NotificationType) => {
    return preferences.find((p) => p.type === type);
  };

  const handleTogglePref = (type: NotificationType, field: 'email' | 'in_app') => {
    if (!currentOrgId) return;
    const pref = getPref(type);
    updatePreference.mutate({
      orgId: currentOrgId,
      type,
      email: field === 'email' ? !(pref?.email ?? true) : (pref?.email ?? true),
      in_app: field === 'in_app' ? !(pref?.in_app ?? true) : (pref?.in_app ?? true),
    });
  };

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
    document.getElementById(`settings-tab-${TABS[nextIndex].id}`)?.focus();
  };

  return (
    <AppShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Sidebar navigation */}
        <nav
          role="tablist"
          aria-label="Settings sections"
          className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:gap-1 lg:border-r lg:border-border lg:pr-4 lg:sticky lg:top-24 lg:self-start"
        >
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-privium-500',
                  isActive
                    ? 'bg-privium-500/10 text-privium-400 border border-privium-500/20'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 border border-transparent'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Panels */}
        <div className="min-w-0">
          {/* PROFILE PANEL */}
          <div
            role="tabpanel"
            id="settings-panel-profile"
            aria-labelledby="settings-tab-profile"
            hidden={activeTab !== 'profile'}
          >
            {activeTab === 'profile' && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Manage your profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 pb-2">
                      <Avatar
                        name={profile?.full_name || profile?.email || 'User'}
                        size="lg"
                      />
                      <div>
                        <p className="text-sm font-medium text-surface-200">
                          {profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-surface-500">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Smith"
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        hint="Email cannot be changed"
                      />
                      <Input
                        label="Job title"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="CFO"
                      />
                      <Input
                        label="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Your account details and status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-sm font-medium text-surface-200">Email</p>
                          <p className="text-xs text-surface-500">{profile?.email}</p>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">Verified</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-sm font-medium text-surface-200">Two-Factor Authentication</p>
                          <p className="text-xs text-surface-500">Not yet enabled</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Enable</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* ORGANIZATION PANEL */}
          <div
            role="tabpanel"
            id="settings-panel-organization"
            aria-labelledby="settings-tab-organization"
            hidden={activeTab !== 'organization'}
          >
            {activeTab === 'organization' && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Profile</CardTitle>
                    <CardDescription>Manage your organization details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 pb-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-privium-500/10">
                        <Building2 className="h-7 w-7 text-privium-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-200">
                          {currentOrganization?.name || 'Organization'}
                        </p>
                        <p className="text-xs text-surface-500">
                          {currentOrganization?.tier ? `${currentOrganization.tier} plan` : 'Free plan'}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Organization name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Privium Inc."
                      />
                      <Input
                        label="Slug"
                        value={orgSlug}
                        onChange={(e) => setOrgSlug(e.target.value)}
                        placeholder="privium"
                        hint="Used in URLs"
                      />
                      <Select
                        label="Industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        options={[
                          { value: '', label: 'Select industry' },
                          { value: 'fintech', label: 'Fintech' },
                          { value: 'defi', label: 'DeFi / Crypto' },
                          { value: 'enterprise', label: 'Enterprise' },
                          { value: 'startup', label: 'Startup' },
                          { value: 'other', label: 'Other' },
                        ]}
                      />
                      <Select
                        label="Organization size"
                        value={orgSize}
                        onChange={(e) => setOrgSize(e.target.value)}
                        options={[
                          { value: '', label: 'Select size' },
                          { value: '1-10', label: '1-10 employees' },
                          { value: '11-50', label: '11-50 employees' },
                          { value: '51-200', label: '51-200 employees' },
                          { value: '201-1000', label: '201-1000 employees' },
                          { value: '1000+', label: '1000+ employees' },
                        ]}
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveOrg}
                        disabled={updateOrgSettings.isPending}
                      >
                        {updateOrgSettings.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing & Plan</CardTitle>
                    <CardDescription>Manage your subscription and billing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-surface-200">
                          Current Plan
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                          {currentOrganization?.tier
                            ? `${currentOrganization.tier.charAt(0).toUpperCase() + currentOrganization.tier.slice(1)} plan`
                            : 'Free plan'}
                        </p>
                      </div>
                      <Badge variant="info" size="sm">
                        {currentOrganization?.tier || 'Free'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-surface-200">Payment Method</p>
                        <p className="text-xs text-surface-500 mt-1">No payment method on file</p>
                      </div>
                      <Button variant="outline" size="sm">Add</Button>
                    </div>
                    <div className="rounded-lg bg-surface-800/50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning-light flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-surface-200">Plan Features</p>
                          <p className="text-xs text-surface-500 mt-1">
                            Upgrade to unlock multi-signature wallets, custom approval workflows,
                            API access, and priority support.
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-3">
                        View Plans
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* NOTIFICATIONS PANEL */}
          <div
            role="tabpanel"
            id="settings-panel-notifications"
            aria-labelledby="settings-tab-notifications"
            hidden={activeTab !== 'notifications'}
          >
            {activeTab === 'notifications' && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose which notifications you receive and how
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {/* Header row */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px] gap-4 px-4 py-2 text-xs font-medium text-surface-500 uppercase tracking-wider">
                        <span>Notification Type</span>
                        <span className="text-center">In-App</span>
                        <span className="text-center">Email</span>
                      </div>

                      {NOTIFICATION_TYPES.map((nt) => {
                        const pref = getPref(nt.value);
                        const inApp = pref?.in_app ?? true;
                        const email = pref?.email ?? true;

                        return (
                          <div
                            key={nt.value}
                            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_80px] gap-4 items-center rounded-lg px-4 py-3 hover:bg-surface-800/30 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-surface-200">
                                {nt.label}
                              </p>
                              <p className="text-xs text-surface-500">{nt.description}</p>
                            </div>
                            <div className="flex justify-center">
                              <ToggleSwitch
                                checked={inApp}
                                onChange={() => handleTogglePref(nt.value, 'in_app')}
                                aria-label={`${nt.label} in-app notifications`}
                              />
                            </div>
                            <div className="flex justify-center">
                              <ToggleSwitch
                                checked={email}
                                onChange={() => handleTogglePref(nt.value, 'email')}
                                aria-label={`${nt.label} email notifications`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quiet Hours</CardTitle>
                    <CardDescription>Set times when you don't want to be disturbed</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-surface-200">Do Not Disturb</p>
                        <p className="text-xs text-surface-500">Mute all non-critical notifications</p>
                      </div>
                      <ToggleSwitch checked={false} onChange={() => {}} aria-label="Do not disturb" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="From"
                        type="time"
                        defaultValue="22:00"
                      />
                      <Input
                        label="To"
                        type="time"
                        defaultValue="07:00"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* SECURITY PANEL */}
          <div
            role="tabpanel"
            id="settings-panel-security"
            aria-labelledby="settings-tab-security"
            hidden={activeTab !== 'security'}
          >
            {activeTab === 'security' && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Current password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="New password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        error={passwordError}
                      />
                      <Input
                        label="Confirm new password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleChangePassword}
                        disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                      >
                        {changePassword.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4" />
                        )}
                        Change password
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-sm font-medium text-surface-200">Authenticator App</p>
                          <p className="text-xs text-surface-500">
                            Use an authenticator app to generate codes
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Enable</Button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="text-sm font-medium text-surface-200">SMS Authentication</p>
                          <p className="text-xs text-surface-500">
                            Receive codes via text message
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" disabled>Coming Soon</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>Manage your active sessions across devices</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-privium-500/10">
                          <Globe className="h-4 w-4 text-privium-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-surface-200">Current Session</p>
                          <p className="text-xs text-surface-500">
                            Chrome on macOS · {navigator.platform || 'Desktop'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* APPEARANCE PANEL */}
          <div
            role="tabpanel"
            id="settings-panel-appearance"
            aria-labelledby="settings-tab-appearance"
            hidden={activeTab !== 'appearance'}
          >
            {activeTab === 'appearance' && (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Customize how PRIVIUM looks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-150',
                          'hover:border-surface-600',
                          theme === 'light'
                            ? 'border-privium-500 bg-privium-500/5'
                            : 'border-border bg-surface-800/30'
                        )}
                        aria-pressed={theme === 'light'}
                      >
                        <Sun className="h-8 w-8 text-accent" />
                        <span className="text-sm font-medium text-surface-200">Light</span>
                        {theme === 'light' && (
                          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-privium-500">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-150',
                          'hover:border-surface-600',
                          theme === 'dark'
                            ? 'border-privium-500 bg-privium-500/5'
                            : 'border-border bg-surface-800/30'
                        )}
                        aria-pressed={theme === 'dark'}
                      >
                        <Moon className="h-8 w-8 text-privium-400" />
                        <span className="text-sm font-medium text-surface-200">Dark</span>
                        {theme === 'dark' && (
                          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-privium-500">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>

                      <button
                        onClick={toggleTheme}
                        className={cn(
                          'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-150',
                          'hover:border-surface-600',
                          'border-border bg-surface-800/30'
                        )}
                        aria-label="Use system theme"
                      >
                        <div className="flex gap-2">
                          <Sun className="h-7 w-7 text-accent" />
                          <Moon className="h-7 w-7 text-privium-400" />
                        </div>
                        <span className="text-sm font-medium text-surface-200">System</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Layout</CardTitle>
                    <CardDescription>Configure your interface preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-surface-200">Compact Mode</p>
                        <p className="text-xs text-surface-500">Reduce padding and spacing</p>
                      </div>
                      <ToggleSwitch checked={false} onChange={() => {}} aria-label="Compact mode" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-surface-200">Sidebar Collapsed</p>
                        <p className="text-xs text-surface-500">Keep sidebar collapsed by default</p>
                      </div>
                      <ToggleSwitch checked={false} onChange={() => {}} aria-label="Sidebar collapsed" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ──────────────── Toggle Switch Component ────────────────

function ToggleSwitch({
  checked,
  onChange,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  'aria-label': string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-privium-500',
        checked ? 'bg-privium-500' : 'bg-surface-700'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150 ease-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}