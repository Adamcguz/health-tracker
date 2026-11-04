import type { ReactNode } from 'react'

export default function PageShell({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="min-h-full px-4 pt-6 pb-24">
      <h1 className="mb-4 text-2xl font-semibold text-slate-50">{title}</h1>
      <div className="text-slate-300">{children}</div>
    </div>
  )
}
