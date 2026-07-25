import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive'
type Size = 'default' | 'sm'

const variants: Record<Variant, string> = {
  default: 'bg-slate-900 text-white hover:bg-slate-800',
  outline: 'border border-slate-300 bg-white hover:bg-slate-50',
  ghost: 'hover:bg-slate-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}
const sizes: Record<Size, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 px-3 text-sm',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
