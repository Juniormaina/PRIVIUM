import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, Wallet, Clock, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500">Total Balance</p>
                <p className="mt-1 text-2xl font-bold text-surface-100">$2,847,293</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12.5% this month</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-privium-500/10">
                <Wallet className="h-6 w-6 text-privium-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500">Monthly Payroll</p>
                <p className="mt-1 text-2xl font-bold text-surface-100">$483,000</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-surface-500">
                  <Clock className="h-3 w-3" />
                  <span>Next cycle in 5 days</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500">Active Employees</p>
                <p className="mt-1 text-2xl font-bold text-surface-100">128</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-success">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>+3 this quarter</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500">Pending Approvals</p>
                <p className="mt-1 text-2xl font-bold text-surface-100">7</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-warning">
                  <ArrowDownRight className="h-3 w-3" />
                  <span>3 require attention</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="outline" size="sm">View all</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'in', name: 'USDC Transfer', amount: '+$150,000', desc: 'From Operating Account', time: '2 min ago' },
                { type: 'out', name: 'Payroll Batch', amount: '-$48,200', desc: 'Monthly salary distribution', time: '1 hour ago' },
                { type: 'in', name: 'Client Payment', amount: '+$75,000', desc: 'Invoice INV-2024-089', time: '3 hours ago' },
                { type: 'out', name: 'Vendor Payment', amount: '-$12,500', desc: 'Infrastructure services', time: '5 hours ago' },
                { type: 'in', name: 'Yield Distribution', amount: '+$3,240', desc: 'Treasury yield Q3', time: '1 day ago' },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-surface-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      tx.type === 'in' ? 'bg-success/10' : 'bg-danger/10'
                    }`}>
                      {tx.type === 'in' ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-danger" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{tx.name}</p>
                      <p className="text-xs text-surface-500">{tx.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      tx.type === 'in' ? 'text-success' : 'text-danger'
                    }`}>{tx.amount}</p>
                    <p className="text-xs text-surface-500">{tx.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-between" variant="default">
              <span>New Transfer</span>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button className="w-full justify-between" variant="secondary">
              <span>Run Payroll</span>
              <DollarSign className="h-4 w-4" />
            </Button>
            <Button className="w-full justify-between" variant="secondary">
              <span>Invite Member</span>
              <Users className="h-4 w-4" />
            </Button>
            <Button className="w-full justify-between" variant="outline">
              <span>View Reports</span>
              <TrendingUp className="h-4 w-4" />
            </Button>

            <div className="mt-6 rounded-lg bg-surface-800/50 p-4">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Compliance Status</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">KYC/KYB</span>
                  <Badge variant="success" size="sm">Verified</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">AML Screening</span>
                  <Badge variant="success" size="sm">Clear</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-300">Audit Trail</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}