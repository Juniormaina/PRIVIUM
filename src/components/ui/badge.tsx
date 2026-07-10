import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-privium-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-privium-100 dark:bg-privium-900/30 text-privium-700 dark:text-privium-300',
        success:
          'bg-success/10 dark:bg-success/10 text-success-dark dark:text-success-light',
        warning:
          'bg-warning/10 dark:bg-warning/10 text-warning-dark dark:text-warning-light',
        danger:
          'bg-danger/10 dark:bg-danger/10 text-danger-dark dark:text-danger-light',
        info: 'bg-info/10 dark:bg-info/10 text-info-dark dark:text-info-light',
        outline:
          'border border-border text-muted-foreground',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };