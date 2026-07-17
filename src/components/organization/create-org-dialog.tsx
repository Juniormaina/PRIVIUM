import { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useOrganization } from '../../providers/organization-provider';
import { Building2, ArrowRight, Check, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

const INDUSTRIES = [
  { value: 'fintech', label: 'Fintech' },
  { value: 'defi', label: 'DeFi / Crypto' },
  { value: 'technology', label: 'Technology' },
  { value: 'banking', label: 'Banking' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

const SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-1000', label: '201-1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

export function CreateOrgDialog() {
  const { showCreateOrg, setShowCreateOrg, createOrganization } = useOrganization();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [nameError, setNameError] = useState('');

  const handleClose = () => {
    setShowCreateOrg(false);
    setStep(0);
    setName('');
    setSlug('');
    setIndustry('');
    setSize('');
    setNameError('');
  };

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    const generated = generateSlug(val);
    setSlug(generated);
    if (val.length < 2) {
      setNameError('Name must be at least 2 characters');
    } else {
      setNameError('');
    }
  };

  const handleCreate = async () => {
    if (!name || name.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    await createOrganization.mutateAsync({ name, slug, industry, size });
    handleClose();
  };

  const steps = [
    {
      title: 'Name your organization',
      description: 'Give your enterprise a name that represents your brand.',
      content: (
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-privium-500/10">
              <Building2 className="h-10 w-10 text-privium-400" />
            </div>
          </div>
          <Input
            label="Organization Name"
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            error={nameError}
            autoFocus
          />
          <Input
            label="URL Slug"
            placeholder="e.g. acme-corp"
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            hint="This will be used in URLs and API endpoints"
          />
        </div>
      ),
    },
    {
      title: 'Tell us about your company',
      description: 'Help us tailor the experience to your needs.',
      content: (
        <div className="space-y-6 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Industry</label>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  onClick={() => setIndustry(ind.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                    industry === ind.value
                      ? 'border-privium-500 bg-privium-500/10 text-privium-400'
                      : 'border-border text-muted-foreground hover:border-surface-600 hover:text-foreground'
                  )}
                >
                  {industry === ind.value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  {ind.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Company Size</label>
            <div className="grid grid-cols-1 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                    size === s.value
                      ? 'border-privium-500 bg-privium-500/10 text-privium-400'
                      : 'border-border text-muted-foreground hover:border-surface-600 hover:text-foreground'
                  )}
                >
                  {size === s.value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'You\'re all set!',
      description: 'Your organization is ready to go. Let\'s get started.',
      content: (
        <div className="space-y-6 py-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
              <Sparkles className="h-12 w-12 text-success" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{name || 'Your Organization'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your workspace is ready. Invite your team, set up treasury accounts, and start managing your finances.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <Dialog
      open={showCreateOrg}
      onClose={handleClose}
      title={currentStep.title}
      description={currentStep.description}
      className="max-w-md"
    >
      {currentStep.content}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 w-6 rounded-full transition-colors',
                i === step ? 'bg-privium-500' : i < step ? 'bg-privium-500/30' : 'bg-surface-700'
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step < steps.length - 1 ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (!name || name.length < 2)}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Skip for now
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createOrganization.isPending}
              >
                {createOrganization.isPending ? 'Creating...' : 'Let\'s go!'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}