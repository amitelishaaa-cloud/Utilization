'use server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { validateCredentials } from '@/lib/auth/validation'

type AuthState = { error: string | null }

function readCredentials(formData: FormData) {
  return {
    email: ((formData.get('email') as string) ?? '').trim(),
    password: (formData.get('password') as string) ?? '',
  }
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  const validationError = validateCredentials(email, password)
  if (validationError) return { error: validationError }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  // Deliberately vague — do not reveal whether the address is registered.
  if (error) return { error: 'האימייל או הסיסמה שגויים' }

  redirect('/cockpit')
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  const validationError = validateCredentials(email, password)
  if (validationError) return { error: validationError }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  // Guards the assumption this flow is built on: Confirm Email must be off in
  // the Supabase dashboard, so signUp returns a live session.
  if (!data.session) {
    return { error: 'ההרשמה דורשת אימות אימייל. פנה למנהל המערכת.' }
  }

  redirect('/cockpit')
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
