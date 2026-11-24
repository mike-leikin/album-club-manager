import { describe, it, expect } from 'vitest'
import { isDisposableEmail } from '@/lib/auth/disposableEmail'

describe('isDisposableEmail', () => {
  it.each([
    'vewejak623@dvdee.com',
    'someone@mailinator.com',
    'Someone@DVDEE.COM',
    'x@mail.dvdee.com', // subdomain of a listed domain
    'x@dvdee.com.', // trailing dot
  ])('flags %s', (email) => {
    expect(isDisposableEmail(email)).toBe(true)
  })

  it.each([
    'member@gmail.com',
    'member@outlook.com',
    'member@icloud.com',
    'member@proton.me',
    'member@company.co.uk',
    'member@notdvdee.com', // suffix match must be on a label boundary
    'not-an-email',
  ])('allows %s', (email) => {
    expect(isDisposableEmail(email)).toBe(false)
  })
})
