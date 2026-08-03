import { describe, it, expect } from 'vitest'
import { validateCredentials, MIN_PASSWORD_LENGTH } from '../validation'

describe('validateCredentials', () => {
  it('accepts a valid pair', () => {
    expect(validateCredentials('user@example.com', 'hunter2!')).toBeNull()
  })

  it('rejects a missing email', () => {
    expect(validateCredentials('', 'hunter2!')).toBe('כתובת אימייל היא שדה חובה')
    expect(validateCredentials('   ', 'hunter2!')).toBe('כתובת אימייל היא שדה חובה')
  })

  it('rejects a malformed email', () => {
    expect(validateCredentials('not-an-email', 'hunter2!')).toBe('כתובת האימייל אינה תקינה')
    expect(validateCredentials('user@', 'hunter2!')).toBe('כתובת האימייל אינה תקינה')
    expect(validateCredentials('user@example', 'hunter2!')).toBe('כתובת האימייל אינה תקינה')
    expect(validateCredentials('user example@x.com', 'hunter2!')).toBe('כתובת האימייל אינה תקינה')
  })

  it('rejects a missing password', () => {
    expect(validateCredentials('user@example.com', '')).toBe('סיסמה היא שדה חובה')
  })

  it('rejects a password shorter than the minimum', () => {
    const tooShort = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    expect(validateCredentials('user@example.com', tooShort)).toBe(
      `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`,
    )
  })

  it('accepts a password of exactly the minimum length', () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(validateCredentials('user@example.com', exact)).toBeNull()
  })

  it('does not trim the password', () => {
    // רווחים הם תווים לגיטימיים בסיסמה — אסור לחתוך אותם
    expect(validateCredentials('user@example.com', '  a  b  ')).toBeNull()
  })

  it('checks the email before the password', () => {
    expect(validateCredentials('', '')).toBe('כתובת אימייל היא שדה חובה')
  })
})
