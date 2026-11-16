import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { getTagColorStyle } from '@/utils/tags'

type TagPillProps = {
  name: string
  color: string
  className?: string
  icon?: ReactNode
}

export function TagPill({ name, color, className, icon }: TagPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold',
        className,
      )}
      style={getTagColorStyle(color)}
    >
      {icon}
      {name}
    </span>
  )
}
