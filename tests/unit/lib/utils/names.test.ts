import { describe, it, expect } from 'vitest'
import { getFirstName } from '@/lib/utils/names'

describe('getFirstName', () => {
  it('extracts first name from full name', () => {
    expect(getFirstName('John Doe')).toBe('John')
  })

  it('extracts first name from three-part name', () => {
    expect(getFirstName('Mary Jane Smith')).toBe('Mary')
  })

  it('returns single name as-is', () => {
    expect(getFirstName('Prince')).toBe('Prince')
  })

  it('returns Anonymous for empty string', () => {
    expect(getFirstName('')).toBe('Anonymous')
  })

  it('returns Anonymous for null', () => {
    expect(getFirstName(null)).toBe('Anonymous')
  })

  it('returns Anonymous for undefined', () => {
    expect(getFirstName(undefined)).toBe('Anonymous')
  })

  it('trims whitespace and extracts first name', () => {
    expect(getFirstName('  John  Doe  ')).toBe('John')
  })

  it('handles multiple spaces between names', () => {
    expect(getFirstName('John    Doe')).toBe('John')
  })
})
