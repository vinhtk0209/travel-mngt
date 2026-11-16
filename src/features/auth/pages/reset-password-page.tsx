import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/utils/errors'
import { updatePassword } from '../api'
import { useAuth } from '../auth-context'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas'

export function ResetPasswordPage() {
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await updatePassword(values.password)
      toast.success('Password updated. You are all set!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not update your password.'))
    }
  })

  if (isLoading) {
    return (
      <AuthShell title="One moment" subtitle="Checking your reset link…">
        <div className="flex justify-center py-10">
          <Spinner className="h-7 w-7" />
        </div>
      </AuthShell>
    )
  }

  if (!session) {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="Password reset links can only be used once. Request a fresh one and we'll try again."
        footer={
          <Link to="/login" className="font-bold text-coral-600">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-4 rounded-3xl bg-coral-100 p-4 text-coral-500">
            <KeyRound className="h-8 w-8" />
          </span>
          <Link to="/forgot-password" className="w-full">
            <Button className="w-full" size="lg">
              Request a new link
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose something lovely and easy to remember."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {serverError ? (
          <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        <Field label="New password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters"
            {...register('password')}
          />
        </Field>

        <Field
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  )
}
