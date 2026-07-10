import { AppShell } from '../components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DollarSign, Plus, Users, Calendar, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function PayrollPage() {
  return (
    <AppShell title="Payroll">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-surface-500">Manage payroll cycles, employees, and salary distributions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Cycle
          </Button>
        </div>
      </div>

      {/* Payroll Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-surface-500">Active Employees</p>
            <p className="mt-1 text-2xl font-bold text-surface-100">128</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-surface-500">
              <Badge variant="success" size="sm">Full-time</Badge>
              <Badge variant="outline" size="sm">12 Contractors</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-surface-500">Monthly Payroll</p>
            <p className="mt-1 text-2xl font-bold text-surface-100">$483,000</p>
            <p className="mt-1 text-xs text-surface-500">Next cycle: Dec 1, 2024</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-surface-500">Pending Approval</p>
            <p className="mt-1 text-2xl font-bold text-warning">$48,200</p>
            <p className="mt-1 text-xs text-surface-500">2 cycles awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-surface-500">This Quarter</p>
            <p className="mt-1 text-2xl font-bold text-surface-100">$1.45M</p>
            <p className="mt-1 text-xs text-success">+8.3% vs last quarter</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Payroll Cycle */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Current Payroll Cycle</CardTitle>
              <CardDescription>November 16 - November 30, 2024</CardDescription>
            </div>
            <Badge variant="warning" size="lg">In Progress</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { dept: 'Engineering', headcount: 45, total: '$215,000', status: 'calculated' },
                { dept: 'Operations', headcount: 28, total: '$98,000', status: 'calculated' },
                { dept: 'Finance & Legal', headcount: 18, total: '$72,000', status: 'approved' },
                { dept: 'Sales & Marketing', headcount: 25, total: '$88,000', status: 'pending' },
                { dept: 'Executive', headcount: 12, total: '$60,000', status: 'pending' },
              ].map((dept) => (
                <div key={dept.dept} className="flex items-center justify-between py-2 border-b border-surface-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-surface-200">{dept.dept}</p>
                    <p className="text-xs text-surface-500">{dept.headcount} employees</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-surface-200">{dept.total}</span>
                    <Badge variant={dept.status === 'approved' ? 'success' : dept.status === 'calculated' ? 'info' : 'warning'} size="sm">
                      {dept.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg bg-surface-800/50 p-4">
              <div>
                <p className="text-sm font-medium text-surface-200">Total Payroll</p>
                <p className="text-xs text-surface-500">128 employees</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-surface-100">$533,000</p>
                <Button size="sm" className="mt-1">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Submit for Approval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cycles</CardTitle>
            <CardDescription>Last 5 payroll runs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { period: 'Nov 1-15', amount: '$478,000', status: 'completed' },
              { period: 'Oct 16-31', amount: '$482,000', status: 'completed' },
              { period: 'Oct 1-15', amount: '$475,000', status: 'completed' },
              { period: 'Sep 16-30', amount: '$480,000', status: 'completed' },
              { period: 'Sep 1-15', amount: '$471,000', status: 'completed' },
            ].map((cycle) => (
              <div key={cycle.period} className="flex items-center justify-between py-2 border-b border-surface-800 last:border-0">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-surface-500" />
                  <span className="text-sm text-surface-300">{cycle.period}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-200">{cycle.amount}</span>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}