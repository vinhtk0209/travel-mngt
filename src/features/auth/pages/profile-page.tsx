import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Mail, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppShell } from '@/components/shared/app-shell'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/utils/errors'
import { useAuth } from '../auth-context'
import { useProfile, useUpdateProfile } from '../hooks'
import { profileSchema, type ProfileValues } from '../schemas'

export function ProfilePage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { data: profile, displayName, email, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName },
  })

  useEffect(() => {
    reset({ displayName })
  }, [displayName, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values.displayName)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update your profile'))
    }
  })

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not sign out'))
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="How your travel buddies see you across shared trips."
        actions={
          <Button variant="secondary" onClick={() => void handleSignOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col items-center gap-4 p-7 text-center">
          <Avatar name={displayName} size="xl" />
          <div>
            <p className="font-display text-2xl font-extrabold">{displayName}</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-ink-muted">
              <Mail className="h-3.5 w-3.5" /> {email}
            </p>
          </div>
          <span className="rounded-full bg-mint-100 px-3 py-1 text-xs font-bold text-mint-600">
            {profile ? 'Profile connected' : 'New explorer'}
          </span>
        </Card>

        <Card className="p-6 sm:p-7">
          <h2 className="text-xl font-bold">Account details</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Your email is used for invitations and sign-in. It is never shown publicly outside your
            trips.
          </p>

          {isLoading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
                <Input id="displayName" {...register('displayName')} />
              </Field>

              <Field label="Email" htmlFor="email" hint="Contact support to change your email.">
                <Input id="email" value={email} readOnly disabled />
              </Field>

              <Button type="submit" isLoading={updateProfile.isPending}>
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
