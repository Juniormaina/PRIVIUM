import { forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

const DialogOverlay = forwardRef<HTMLDivElement, { onClose: () => void }>(
  ({ onClose }, ref) => (
    <div
      ref={ref}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      onClick={onClose}
      aria-hidden="true"
    />
  )
);
DialogOverlay.displayName = 'DialogOverlay';

function Dialog({ open, onClose, children, title, description, className }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'dialog-title' : undefined}>
      <DialogOverlay onClose={onClose} />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-xl border border-border',
          'bg-card shadow-xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export { Dialog };