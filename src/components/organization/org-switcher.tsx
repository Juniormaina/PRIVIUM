import { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../../providers/organization-provider';
import { Avatar } from '../ui/avatar';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export function OrgSwitcher() {
  const {
    organizations,
    currentOrgId,
    setCurrentOrgId,
    setShowCreateOrg,
    currentOrganization,
    isOrgsLoading,
  } = useOrganization();
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

  if (isOrgsLoading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-800/30 border border-surface-800">
        <div className="h-8 w-8 rounded-lg bg-surface-700 animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-24 bg-surface-700 rounded animate-pulse" />
          <div className="h-2 w-16 bg-surface-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <button
        onClick={() => setShowCreateOrg(true)}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-surface-700 px-3 py-2 text-sm text-surface-400 hover:text-surface-200 hover:border-surface-600 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-800">
          <Plus className="h-4 w-4" />
        </div>
        <span>Create Organization</span>
      </button>
    );
  }

  const currentOrg = organizations.find((o) => o.id === currentOrgId) || currentOrganization;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg border border-surface-800 px-3 py-2 hover:bg-surface-800/50 transition-colors text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-privium-500/10">
          <Building2 className="h-4 w-4 text-privium-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-200 truncate">
            {currentOrg?.name || 'Select Organization'}
          </p>
          <p className="text-[10px] text-surface-500 truncate">
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-surface-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[200px] rounded-xl border border-surface-800 bg-surface-900 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 z-50">
          <div className="p-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setCurrentOrgId(org.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  org.id === currentOrgId
                    ? 'bg-privium-500/10 text-privium-400'
                    : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-800">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-sm font-medium truncate">{org.name}</span>
                {org.id === currentOrgId && (
                  <Check className="h-4 w-4 text-privium-400" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-surface-800 p-1">
            <button
              onClick={() => {
                setOpen(false);
                setShowCreateOrg(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Organization</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}