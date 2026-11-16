import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/utils/errors'
import { getSafeRedirectPath } from '@/utils/redirect'
import { signInWithPassword } from '../api'
import { signInSchema, type SignInValues } from '../schemas'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get('redirect'))
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await signInWithPassword(values.email, values.password)
      navigate(redirect, { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not sign in. Check your details.'))
    }
  })

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Your trips, places and little plans are right where you left them."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-bold text-coral-600 hover:text-coral-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {serverError ? (
          <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            {...register('password')}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-bold text-ink-soft hover:text-coral-600"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Link
        to={`/login/email?redirect=${encodeURIComponent(redirect)}`}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-white/80 px-5 text-sm font-bold text-ink transition hover:border-coral-200 hover:bg-coral-50"
      >
        <Mail className="h-4 w-4" /> Sign in with an email link
      </Link>
    </AuthShell>
  )
}
