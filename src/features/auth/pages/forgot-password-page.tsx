import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/utils/errors'
import { requestPasswordReset } from '../api'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'

export function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await requestPasswordReset(values.email)
      setSentTo(values.email)
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not send the reset email.'))
    }
  })

  return (
    <AuthShell
      title="A fresh start"
      subtitle="Tell us your email and we'll send a link to set a new password."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-bold text-coral-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      }
    >
      {sentTo ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-4 rounded-3xl bg-mint-100 p-4 text-mint-600">
            <MailCheck className="h-8 w-8" />
          </span>
          <p className="text-sm leading-relaxed text-ink-soft">
            If an account exists for <strong className="text-ink">{sentTo}</strong>, a reset link is
            on its way. It may take a minute to arrive.
          </p>
          <Link to="/login" className="mt-6 w-full">
            <Button variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
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

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
