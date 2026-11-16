import { cn } from '@/utils/cn'
import { getAvatarGradient, getInitials } from '@/utils/name'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

type AvatarProps = {
  name: string | null | undefined
  src?: string | null
  size?: AvatarSize
  className?: string
  ring?: boolean
}

export function Avatar({ name, src, size = 'md', className, ring = false }: AvatarProps) {
  const label = name?.trim() || 'Traveler'
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-extrabold text-ink/80',
        getAvatarGradient(label),
        sizeClasses[size],
        ring && 'ring-2 ring-white',
        className,
      )}
      aria-label={label}
      title={label}
    >
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        getInitials(label)
      )}
    </span>
  )
}

type AvatarGroupProps = {
  members: { user_id: string; display_name: string; avatar_url?: string | null }[]
  max?: number
  size?: AvatarSize
}

export function AvatarGroup({ members, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = members.slice(0, max)
  const rest = members.length - visible.length

  return (
    <div className="flex items-center">
      {visible.map((member, index) => (
        <Avatar
          key={member.user_id}
          name={member.display_name}
          src={member.avatar_url}
          size={size}
          ring
          className={index > 0 ? '-ml-2' : ''}
        />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            '-ml-2 inline-flex items-center justify-center rounded-full bg-ink/80 font-extrabold text-white ring-2 ring-white',
            sizeClasses[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  )
}
