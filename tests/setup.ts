import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Regular afterEach for cleanup
afterEach(() => {
  cleanup()
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.RESEND_FROM_EMAIL = 'test@example.com'

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) =>
    callback({
      setLevel: vi.fn(),
      setContext: vi.fn(),
      setUser: vi.fn(),
      setTag: vi.fn(),
    })
  ),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
  redirect: vi.fn(),
}))

// Mock window.confirm and window.alert
global.confirm = vi.fn(() => true)
global.alert = vi.fn()

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as Crypto
}
global.crypto.randomUUID = () => 'test-uuid-1234'

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = vi.fn()
}

// Mock localStorage
class LocalStorageMock {
  store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }

  key(index: number) {
    const keys = Object.keys(this.store)
    return keys[index] || null
  }

  get length() {
    return Object.keys(this.store).length
  }
}

global.localStorage = new LocalStorageMock() as any
