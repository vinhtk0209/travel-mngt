import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, ArrowRight, MailCheck, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/utils/errors'
import { buildAuthCallbackUrl, getSafeRedirectPath } from '@/utils/redirect'
import {
  isEmailLoginUnavailable,
  sendEmailLoginLink,
  verifyEmailLoginCode,
} from '../api'
import {
  emailLoginSchema,
  emailOtpSchema,
  type EmailLoginValues,
  type EmailOtpValues,
} from '../schemas'

export function EmailLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get('redirect'))
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  const emailForm = useForm<EmailLoginValues>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: { email: '' },
  })

  const otpForm = useForm<EmailOtpValues>({
    resolver: zodResolver(emailOtpSchema),
    defaultValues: { token: '' },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const requestLink = async (email: string) => {
    setServerError(null)
    setIsResending(true)
    try {
      await sendEmailLoginLink(email, buildAuthCallbackUrl(window.location.origin, redirect))
      setSentTo(email)
      setCooldown(60)
      otpForm.reset({ token: '' })
    } catch (error) {
      if (isEmailLoginUnavailable(error)) {
        setSentTo(email)
        setCooldown(60)
        otpForm.reset({ token: '' })
        return
      }
      setServerError(getErrorMessage(error, 'Could not send the sign-in email.'))
    } finally {
      setIsResending(false)
    }
  }

  const onSubmitEmail = emailForm.handleSubmit(async (values) => {
    await requestLink(values.email)
  })

  const onSubmitCode = otpForm.handleSubmit(async (values) => {
    if (!sentTo) return
    setServerError(null)
    try {
      const data = await verifyEmailLoginCode(sentTo, values.token)
      if (!data.session) {
        throw new Error('Your session could not be started. Request a new link.')
      }
      navigate(redirect, { replace: true })
    } catch (error) {
      setServerError(
        getErrorMessage(error, 'That code could not be verified. Request a new one.'),
      )
    }
  })

  const useDifferentEmail = () => {
    setSentTo(null)
    setServerError(null)
    setCooldown(0)
    emailForm.reset({ email: '' })
    otpForm.reset({ token: '' })
  }

  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}`

  if (sentTo) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={
          <>
            We sent a sign-in link and a 6-digit code to{' '}
            <strong className="text-ink">{sentTo}</strong>. Click the link or enter the code below.
          </>
        }
        footer={
          <Link to={loginHref} className="inline-flex items-center gap-1 font-bold text-coral-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to password sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 rounded-3xl bg-mint-100 p-4 text-mint-600">
            <MailCheck className="h-8 w-8" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            The link works once and expires in one hour. If this email does not arrive, check your
            spam folder or send a fresh one.
          </p>

          {serverError ? (
            <div
              className="mt-5 flex w-full gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-left text-sm font-semibold text-rose-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </div>
          ) : null}

          <form onSubmit={onSubmitCode} className="mt-6 w-full space-y-4 text-left" noValidate>
            <Field
              label="6-digit code"
              htmlFor="email-login-token"
              error={otpForm.formState.errors.token?.message}
            >
              <Input
                id="email-login-token"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                className="h-14 text-center text-2xl font-extrabold tracking-[0.32em]"
                {...otpForm.register('token')}
              />
            </Field>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={otpForm.formState.isSubmitting}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Verify code
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-3 text-sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void requestLink(sentTo)}
              disabled={cooldown > 0 || isResending}
              isLoading={isResending}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
            </Button>
            <button
              type="button"
              onClick={useDifferentEmail}
              className="font-bold text-coral-600 hover:text-coral-700"
            >
              Use a different email
            </button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Sign in with email"
      subtitle="We'll send a one-time sign-in link and a 6-digit code. Your email must already belong to a Wanderlist account."
      footer={
        <Link to={loginHref} className="inline-flex items-center gap-1 font-bold text-coral-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to password sign in
        </Link>
      }
    >
      <form onSubmit={onSubmitEmail} className="space-y-4" noValidate>
        {serverError ? (
          <div
            className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        <Field
          label="Email"
          htmlFor="email"
          error={emailForm.formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...emailForm.register('email')}
          />
        </Field>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={emailForm.formState.isSubmitting || isResending}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Send sign-in email
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-muted">
        New to Wanderlist?{' '}
        <Link
          to="/register"
          className="font-bold text-coral-600 hover:text-coral-700"
        >
          Create an account
        </Link>{' '}
        first, then use email sign-in.
      </p>
    </AuthShell>
  )
}
