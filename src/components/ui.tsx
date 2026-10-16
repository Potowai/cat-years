import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

type Variant = 'primary' | 'butter' | 'ink' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-tangerine text-paper hover:bg-tangerine/90',
  butter: 'bg-butter text-ink hover:bg-butter/90',
  ink: 'bg-ink text-paper hover:bg-ink/90',
  outline: 'bg-paper text-ink hover:bg-cream',
  ghost: 'border-transparent bg-transparent shadow-none hover:bg-cream',
  danger: 'bg-blush text-ink hover:bg-blush/90',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
}

export function buttonClass(opts?: {
  variant?: Variant
  size?: Size
  className?: string
}) {
  const { variant = 'primary', size = 'md', className } = opts ?? {}
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-full border-2 border-ink font-bold shadow-sticker-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sticker-sm',
    VARIANTS[variant],
    SIZES[size],
    variant === 'ghost' && 'shadow-none hover:translate-y-0',
    className,
  )
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button className={buttonClass({ variant, size, className })} {...props} />
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-base font-medium text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-4 focus:ring-sky/30',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-base font-medium text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-4 focus:ring-sky/30',
        className,
      )}
      {...props}
    />
  )
}

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode
  htmlFor?: string
  hint?: ReactNode
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-bold tracking-wide">
        {children}
      </label>
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </div>
  )
}

export function Chip({
  children,
  tone = 'cream',
  className,
}: {
  children: ReactNode
  tone?: string
  className?: string
}) {
  const tones: Record<string, string> = {
    cream: 'bg-cream text-ink',
    tangerine: 'bg-tangerine text-paper',
    butter: 'bg-butter text-ink',
    sage: 'bg-sage text-paper',
    sky: 'bg-sky text-paper',
    plum: 'bg-plum text-paper',
    blush: 'bg-blush text-ink',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold uppercase tracking-wider',
        tones[tone] ?? tones.cream,
        className,
      )}
    >
      {children}
    </span>
  )
}
