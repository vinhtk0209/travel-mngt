import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme()
  const label = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label={label}
      title={label}
    >
      {resolved === 'dark' ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  )
}
