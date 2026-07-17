import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useOrganization } from '../../providers/organization-provider';
import { Check, ArrowRight, Building2, Users, Shield, Wallet, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  action: () => boolean; // returns true if completed
}

export function OnboardingChecklist() {
  const { currentOrganization, departments, members, markOnboardingComplete, onboardingComplete, setShowCreateOrg } = useOrganization();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (onboardingComplete || dismissed) return null;

  const items: OnboardingItem[] = [
    {
      id: 'profile',
      title: 'Complete your organization profile',
      description: 'Add your company details, industry, and size.',
      icon: <Building2 className="h-5 w-5" />,
      action: () => {
        const settings = currentOrganization?.settings as Record<string, unknown> | undefined;
        return !!(settings?.industry || settings?.size);
      },
    },
    {
      id: 'departments',
      title: 'Create departments',
      description: 'Organize your team into departments.',
      icon: <Users className="h-5 w-5" />,
      action: () => departments.length > 0,
    },
    {
      id: 'members',
      title: 'Invite team members',
      description: 'Add colleagues to your organization.',
      icon: <Shield className="h-5 w-5" />,
      action: () => members.length > 1, // At least 2 members (not just self)
    },
    {
      id: 'treasury',
      title: 'Set up treasury accounts',
      description: 'Create your first financial account.',
      icon: <Wallet className="h-5 w-5" />,
      route: '/treasury',
      action: () => false, // Will be checked via treasury query
    },
  ];

  const completedItems = items.filter((item) => item.action());
  const progress = Math.round((completedItems.length / items.length) * 100);
  const allComplete = completedItems.length === items.length;

  return (
    <Card className="border-privium-500/20 bg-privium-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-privium-400" />
            <CardTitle className="text-base">Getting Started</CardTitle>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{completedItems.length} of {items.length} complete</span>
            <span className="text-xs font-medium text-privium-400">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-privium-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {items.map((item) => {
            const isCompleted = item.action();
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  isCompleted ? 'opacity-60' : 'hover:bg-surface-800/30'
                )}
              >
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full',
                  isCompleted ? 'bg-success/10 text-success' : 'bg-surface-800 text-surface-400'
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : item.icon}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    isCompleted ? 'text-surface-500 line-through' : 'text-surface-200'
                  )}>
                    {item.title}
                  </p>
                  <p className="text-xs text-surface-500">{item.description}</p>
                </div>
                {!isCompleted && item.route && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.route!)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {allComplete && (
          <Button
            className="w-full"
            onClick={() => {
              markOnboardingComplete();
              setDismissed(true);
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Complete Setup
          </Button>
        )}
      </CardContent>
    </Card>
  );
}