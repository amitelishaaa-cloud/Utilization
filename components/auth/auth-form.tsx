'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import FormField from '@/components/ui/form-field'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/validation'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

type ActionFn = (
  prev: { error: string | null },
  formData: FormData,
) => Promise<{ error: string | null }>

interface AuthFormProps {
  action: ActionFn
  mode: 'login' | 'signup'
}

export default function AuthForm({ action, mode }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null })
  const isLogin = mode === 'login'

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <FormField label="אימייל" required>
        <input
          type="email"
          name="email"
          required
          autoFocus
          autoComplete="email"
          dir="ltr"
          className={INPUT_CLASS}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField
        label="סיסמה"
        required
        hint={isLogin ? undefined : `לפחות ${MIN_PASSWORD_LENGTH} תווים`}
      >
        <input
          type="password"
          name="password"
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          dir="ltr"
          className={INPUT_CLASS}
        />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'רגע...' : isLogin ? 'התחבר' : 'צור חשבון'}
      </button>

      <div className="text-sm text-gray-500 space-y-2 text-center">
        {isLogin ? (
          <>
            <p>
              אין לך חשבון?{' '}
              <Link href="/signup" className="text-gray-900 font-medium hover:underline">
                הרשמה
              </Link>
            </p>
            <p>
              <Link href="/forgot-password" className="hover:underline">
                שכחתי סיסמה
              </Link>
            </p>
          </>
        ) : (
          <p>
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-gray-900 font-medium hover:underline">
              התחברות
            </Link>
          </p>
        )}
      </div>
    </form>
  )
}
