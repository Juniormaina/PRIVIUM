import { useState, useRef, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { useOrganization } from '../../providers/organization-provider';
import type { OrgRole } from '../../hooks/use-organization';
import { ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS } from '../../hooks/use-organization';
import { cn } from '../../lib/utils';
import { Check, ChevronDown } from 'lucide-react';

const ROLES: OrgRole[] = ['admin', 'manager', 'finance', 'member', 'viewer'];

interface RoleBadgeProps {
  role: OrgRole;
  memberId?: string;
  onChangeRole?: (role: OrgRole) => void;
  isCurrentUser?: boolean;
}

export function RoleBadge({ role, memberId, onChangeRole, isCurrentUser }: RoleBadgeProps) {
  const { isAdmin, userRole } = useOrganization();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canChangeRole = isAdmin && !isCurrentUser;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => canChangeRole && setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1',
          canChangeRole ? 'cursor-pointer' : 'cursor-default'
        )}
        disabled={!canChangeRole}
        aria-label={`Role: ${ROLE_LABELS[role]}`}
      >
        <Badge variant={ROLE_COLORS[role]} size="sm">
          {ROLE_LABELS[role]}
        </Badge>
        {canChangeRole && (
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {open && canChangeRole && (
        <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-xl border border-surface-800 bg-surface-900 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 z-50">
          <div className="p-1">
            <p className="px-3 py-1.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider">
              Change Role
            </p>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  onChangeRole?.(r);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  r === role
                    ? 'bg-privium-500/10 text-privium-400'
                    : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
                )}
              >
                <span className="flex-1">{ROLE_LABELS[r]}</span>
                {r === role && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
            <div className="mt-1 border-t border-surface-800 px-3 pt-1.5">
              <p className="text-[10px] text-surface-500 leading-tight">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}