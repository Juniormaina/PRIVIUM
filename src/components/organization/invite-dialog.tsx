import { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useOrganization } from '../../providers/organization-provider';
import { Mail, Send, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { OrgRole } from '../../hooks/use-organization';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../hooks/use-organization';

const ROLES: OrgRole[] = ['admin', 'manager', 'finance', 'member', 'viewer'];

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteDialog({ open, onClose }: InviteDialogProps) {
  const { sendInvitation, currentOrgId } = useOrganization();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [emailError, setEmailError] = useState('');
  const [sentEmails, setSentEmails] = useState<string[]>([]);

  const validateEmail = (val: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSend = async () => {
    if (!validateEmail(email)) return;
    if (!currentOrgId) return;

    await sendInvitation.mutateAsync({ orgId: currentOrgId, email, role });
    setSentEmails((prev) => [...prev, email]);
    setEmail('');

    // Reset sent confirmation after 3 seconds
    setTimeout(() => {
      setSentEmails([]);
    }, 3000);
  };

  const handleClose = () => {
    onClose();
    setEmail('');
    setRole('member');
    setEmailError('');
    setSentEmails([]);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Invite Members"
      description="Send invitations to join your organization"
    >
      <div className="space-y-6 py-2">
        {/* Sent confirmation */}
        {sentEmails.length > 0 && (
          <div className="rounded-lg bg-success/10 border border-success/20 px-4 py-3">
            <p className="text-sm text-success text-center">
              Invitation{sentEmails.length > 1 ? 's' : ''} sent to {sentEmails.join(', ')}
            </p>
          </div>
        )}

        {/* Email input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              error={emailError}
              autoFocus
            />
          </div>
          <Button onClick={handleSend} disabled={!email || sendInvitation.isPending}>
            <Send className="h-4 w-4 mr-1" />
            Send
          </Button>
        </div>

        {/* Role selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Assign Role</label>
          <div className="space-y-1">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                  role === r
                    ? 'border-privium-500 bg-privium-500/10'
                    : 'border-border hover:border-surface-600'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                  role === r
                    ? 'bg-privium-500 text-white'
                    : 'bg-surface-800 text-surface-400'
                )}>
                  {ROLE_LABELS[r][0]}
                </div>
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    role === r ? 'text-privium-400' : 'text-foreground'
                  )}>
                    {ROLE_LABELS[r]}
                  </p>
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Quick invite link */}
        <Button variant="outline" className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Generate Invite Link
        </Button>
      </div>
    </Dialog>
  );
}