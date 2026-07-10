import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { Building2, Plus, Users, Settings as SettingsIcon, Shield, Key, Mail, UserPlus } from 'lucide-react';

export default function OrganizationPage() {
  return (
    <AppShell title="Organization">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-surface-500">Manage your organization, members, and permissions</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invite Members
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Organization Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization Overview</CardTitle>
            <CardDescription>Your enterprise account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-privium-500/10">
                <Building2 className="h-8 w-8 text-privium-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-100">PRIVIUM Corp</h3>
                <p className="text-sm text-surface-500">Enterprise Tier · Created Dec 2024</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="success" size="sm">Active</Badge>
                  <Badge variant="info" size="sm">Verified</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 rounded-lg bg-surface-800/50 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-surface-100">12</p>
                <p className="text-xs text-surface-500">Members</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-surface-100">4</p>
                <p className="text-xs text-surface-500">Departments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-surface-100">128</p>
                <p className="text-xs text-surface-500">Employees</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-surface-200 mb-3">Team Members</h4>
              <div className="space-y-3">
                {[
                  { name: 'Alice Chen', email: 'alice@privium.io', role: 'Admin' },
                  { name: 'Bob Martinez', email: 'bob@privium.io', role: 'Finance' },
                  { name: 'Carol Davis', email: 'carol@privium.io', role: 'Manager' },
                  { name: 'David Kim', email: 'david@privium.io', role: 'Member' },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between py-2 border-b border-surface-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-surface-200">{member.name}</p>
                        <p className="text-xs text-surface-500">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant={member.role === 'Admin' ? 'default' : 'outline'} size="sm">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Organization configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Users className="h-4 w-4 mr-3" />
              Departments
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-3" />
              Roles & Permissions
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Key className="h-4 w-4 mr-3" />
              API Keys
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Mail className="h-4 w-4 mr-3" />
              Email Settings
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <UserPlus className="h-4 w-4 mr-3" />
              Invitation Links
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <SettingsIcon className="h-4 w-4 mr-3" />
              General Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}