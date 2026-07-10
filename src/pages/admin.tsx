import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Shield, Activity, Users as UsersIcon, Database, Globe, FileText, Wifi, Server, Lock } from 'lucide-react';

export default function AdminPage() {
  return (
    <AppShell title="Admin">
      <div className="grid gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-surface-500" />
              <CardTitle>System Health</CardTitle>
            </div>
            <CardDescription>Platform status and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'API Status', value: 'Operational', variant: 'success' as const, icon: Globe },
                { label: 'Database', value: 'Healthy', variant: 'success' as const, icon: Database },
                { label: 'Blockchain', value: 'Synced', variant: 'success' as const, icon: Server },
                { label: 'Auth Service', value: 'Operational', variant: 'success' as const, icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg bg-surface-800/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-surface-500" />
                      <span className="text-xs text-surface-500">{item.label}</span>
                    </div>
                    <Badge variant={item.variant} size="sm">{item.value}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Admin Sections */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Organizations', desc: 'Manage all tenant organizations', count: '12 active', icon: UsersIcon },
            { title: 'Feature Flags', desc: 'Toggle platform features', count: '8 flags', icon: Shield },
            { title: 'Audit Logs', desc: 'View platform audit trail', count: '2,481 events', icon: FileText },
            { title: 'API Keys', desc: 'Manage API access', count: '14 keys', icon: Lock },
            { title: 'Rate Limits', desc: 'Configure rate limiting', count: '3 policies', icon: Activity },
            { title: 'Network Config', desc: 'Blockchain network settings', count: 'Avalanche L1', icon: Wifi },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="hover:border-privium-500/30 transition-colors cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-privium-500/10 group-hover:bg-privium-500/20 transition-colors">
                      <Icon className="h-5 w-5 text-privium-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{item.title}</p>
                      <p className="text-xs text-surface-500">{item.desc}</p>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm">{item.count}</Badge>
                </CardContent>
              </Card>
            );
          })}
          </div>
      </div>
    </AppShell>
  );
}