import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp, Shield } from 'lucide-react';

export default function TreasuryPage() {
  return (
    <AppShell title="Treasury">
      {/* Treasury Accounts */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-surface-500">Manage your treasury accounts, liquidity, and transfers</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* Account Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          { name: 'Operating Account', balance: '$1,245,000', type: 'operating', change: '+2.3%', wallets: 3 },
          { name: 'Reserve Fund', balance: '$892,400', type: 'reserve', change: '+4.1%', wallets: 2 },
          { name: 'Payroll Pool', balance: '$483,000', type: 'payroll', change: 'Scheduled', wallets: 1 },
          { name: 'Treasury Vault', balance: '$226,893', type: 'treasury', change: '+8.7%', wallets: 4 },
        ].map((account) => (
          <Card key={account.name} className="hover:border-privium-500/30 transition-colors cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-privium-500/10 group-hover:bg-privium-500/20 transition-colors">
                    <Wallet className="h-5 w-5 text-privium-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-200">{account.name}</p>
                    <Badge variant="outline" size="sm" className="mt-1">
                      {account.type}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold text-surface-100">{account.balance}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {account.change}
                </span>
                <span className="text-xs text-surface-500">{account.wallets} wallet{account.wallets > 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Treasury Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transfers</CardTitle>
            <CardDescription>Monitor treasury movements and approvals</CardDescription>
          </div>
          <Button variant="outline" size="sm">View all transfers</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { from: 'Operating', to: 'Payroll Pool', amount: '$48,200', status: 'completed', time: '1 hour ago' },
              { from: 'Reserve Fund', to: 'Operating', amount: '$100,000', status: 'pending', time: '4 hours ago' },
              { from: 'Treasury Vault', to: 'Reserve Fund', amount: '$25,000', status: 'approved', time: '1 day ago' },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-surface-800 last:border-0">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 text-surface-400" />
                  <div>
                    <p className="text-sm font-medium text-surface-200">{tx.from} → {tx.to}</p>
                    <p className="text-xs text-surface-500">{tx.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-surface-200">{tx.amount}</span>
                  <Badge variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'info'} size="sm">
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}