import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/utils/errors'
import { signUpWithPassword } from '../api'
import { signUpSchema, type SignUpValues } from '../schemas'

export function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const result = await signUpWithPassword({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
      })
      if (!result.session) {
        setNeedsConfirmation(true)
      }
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not create your account.'))
    }
  })

  if (needsConfirmation) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="We sent you a confirmation link. Tap it, then come back to start planning."
      >
        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-4 rounded-3xl bg-mint-100 p-4 text-mint-600">
            <MailCheck className="h-8 w-8" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Once your email is confirmed you can sign in and create your very first trip.
          </p>
          <Link to="/login" className="mt-6 w-full">
            <Button className="w-full" size="lg">
              Back to sign in
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your happy place"
      subtitle="Start with an account, then collect every place worth remembering."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-coral-600 hover:text-coral-700">
            Sign in
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

        <Field label="Your name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="Mai Nguyen"
            {...register('displayName')}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="8+ characters"
              {...register('password')}
            />
          </Field>
          <Field
            label="Confirm password"
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
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
