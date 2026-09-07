import Link from 'next/link'
import type { ComponentProps } from 'react'

export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-neutral-600">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  )
}

export function Card({
  children,
  className = '',
  testId,
}: {
  children: React.ReactNode
  className?: string
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className={`rounded-lg border border-neutral-300 bg-white p-5 ${className}`}
    >
      {children}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent/90',
    secondary: 'border border-neutral-400 bg-white hover:bg-neutral-50',
    danger: 'border border-red-400 bg-white text-red-700 hover:bg-red-50',
  }[variant]

  return (
    <button
      {...props}
      className={`rounded px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  )
}

export function LinkButton({
  href,
  children,
  variant = 'secondary',
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent/90'
      : 'border border-neutral-400 bg-white hover:bg-neutral-50'
  return (
    <Link href={href} className={`rounded px-3 py-1.5 text-sm font-medium ${styles}`}>
      {children}
    </Link>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {hint ? <span className="ml-2 text-neutral-500">{hint}</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  )
}

export const inputClass =
  'w-full rounded border border-neutral-400 bg-white px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'info' | 'success'
  children: React.ReactNode
}) {
  const styles = {
    error: 'border-red-300 bg-red-50 text-red-800',
    info: 'border-blue-300 bg-blue-50 text-blue-900',
    success: 'border-green-300 bg-green-50 text-green-900',
  }[kind]
  return <div className={`rounded border px-3 py-2 text-sm ${styles}`}>{children}</div>
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-400 bg-white px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-prose text-sm text-neutral-600">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
