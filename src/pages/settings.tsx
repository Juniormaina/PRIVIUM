import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { useTheme } from '../providers/theme-provider';
import { Sun, Moon, Bell, Shield, Key, Globe, Palette, User, Eye } from 'lucide-react';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <AppShell title="Settings">
      <div className="grid gap-6 max-w-3xl">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name="Jane Smith" size="lg" />
              <Button variant="outline" size="sm">Change avatar</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" defaultValue="Jane Smith" />
              <Input label="Email" type="email" defaultValue="jane@privium.io" />
              <Input label="Job title" defaultValue="CFO" />
              <Input label="Phone" defaultValue="+1 (555) 123-4567" />
            </div>
            <Button>Save changes</Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-surface-500" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize your interface preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-surface-300 dark:border-surface-700 p-4">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-privium-400" />
                ) : (
                  <Sun className="h-5 w-5 text-accent" />
                )}
                <div>
                  <p className="text-sm font-medium text-surface-200">Theme</p>
                  <p className="text-xs text-surface-500">
                    Currently {theme === 'dark' ? 'dark' : 'light'} mode
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                Switch to {theme === 'dark' ? 'light' : 'dark'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-surface-500" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Payroll approvals', desc: 'When a payroll cycle needs your approval' },
              { label: 'Treasury transfers', desc: 'When large transfers are initiated' },
              { label: 'Security alerts', desc: 'Suspicious activity or login attempts' },
              { label: 'Compliance updates', desc: 'KYC/KYB status changes and reminders' },
              { label: 'Weekly summary', desc: 'Get a weekly digest of platform activity' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-surface-200">{item.label}</p>
                  <p className="text-xs text-surface-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-surface-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface-400 after:transition-all peer-checked:bg-privium-500 peer-checked:after:translate-x-full peer-checked:after:bg-white" />
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-surface-500" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your security preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-surface-300 dark:border-surface-700 p-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-surface-200">Two-factor authentication</p>
                  <p className="text-xs text-surface-500">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-surface-300 dark:border-surface-700 p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-surface-200">Active sessions</p>
                  <p className="text-xs text-surface-500">2 active sessions across devices</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}