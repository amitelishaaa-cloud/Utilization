import { describe, it, expect } from 'vitest'
import { isPublicPath } from '../routes'

describe('isPublicPath', () => {
  it('treats the auth screens as public', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/signup')).toBe(true)
    expect(isPublicPath('/forgot-password')).toBe(true)
  })

  it('treats app routes as protected', () => {
    expect(isPublicPath('/cockpit')).toBe(false)
    expect(isPublicPath('/clients')).toBe(false)
    expect(isPublicPath('/projects/new')).toBe(false)
    expect(isPublicPath('/retainers')).toBe(false)
    expect(isPublicPath('/pipeline/abc-123')).toBe(false)
  })

  it('treats the root as protected so it can redirect by session', () => {
    expect(isPublicPath('/')).toBe(false)
  })

  it('does not match on partial prefixes', () => {
    expect(isPublicPath('/loginx')).toBe(false)
    expect(isPublicPath('/signup-admin')).toBe(false)
    expect(isPublicPath('/login/secret')).toBe(false)
  })

  it('ignores a trailing slash', () => {
    expect(isPublicPath('/login/')).toBe(true)
  })
})
