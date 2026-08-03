/** Matches Supabase's own default minimum. */
export const MIN_PASSWORD_LENGTH = 6

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCredentials(email: string, password: string): string | null {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) return 'כתובת אימייל היא שדה חובה'
  if (!EMAIL_PATTERN.test(trimmedEmail)) return 'כתובת האימייל אינה תקינה'

  // Deliberately not trimmed — whitespace is a legitimate password character.
  if (!password) return 'סיסמה היא שדה חובה'
  if (password.length < MIN_PASSWORD_LENGTH)
    return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`

  return null
}
