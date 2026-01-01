# Testing Quick Start Guide

**Last Updated:** 2026-01-01
**Current Status:** 57 tests passing ✅ | 3/5 API routes tested

**Goal:** Get up and running with testing in under 5 minutes

## Running Tests

```bash
# Run all tests
npm test

# Run once (for CI)
npm run test:run

# Run with coverage
npm run test:coverage

# Open visual UI
npm run test:ui
```

## Writing Your First Test

### 1. Create Test File

Place tests next to source files or in `tests/` directory:
```bash
tests/unit/api/my-feature.test.ts
tests/unit/components/MyComponent.test.tsx
tests/integration/flows/myFlow.test.ts
```

### 2. Basic Test Template

```typescript
import { describe, it, expect } from 'vitest'

describe('MyFeature', () => {
  it('does something correctly', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### 3. API Route Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/my-route/route'

describe('POST /api/my-route', () => {
  it('handles valid request', async () => {
    const request = new NextRequest('http://localhost/api/my-route', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### 4. Component Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Using Mock Data

```typescript
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'
import { createMockReview } from '@/tests/mocks/factories/reviewFactory'
import { createMockWeek } from '@/tests/mocks/factories/weekFactory'

// In your test:
const participant = createMockParticipant({ name: 'John Doe' })
const review = createMockReview({ rating: 8.5 })
const week = createMockWeek({ week_number: 1 })
```

## Common Assertions

```typescript
// Basic equality
expect(value).toBe(5)
expect(value).toEqual({ foo: 'bar' })

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()

// Numbers
expect(value).toBeGreaterThan(3)
expect(value).toBeLessThan(10)

// Strings
expect(string).toContain('substring')
expect(string).toMatch(/regex/)

// Arrays
expect(array).toHaveLength(3)
expect(array).toContain('item')

// Objects
expect(object).toHaveProperty('key')
expect(object).toMatchObject({ foo: 'bar' })

// DOM (with @testing-library/jest-dom)
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveTextContent('text')
```

## Completed Test Suites

✅ **Utils Tests** (`tests/unit/lib/utils/names.test.ts`)
- 8 tests covering `getFirstName()` utility

✅ **Review Submission API** (`tests/unit/api/reviews/submit.test.ts`)
- 18 tests with 100% line coverage
- Covers validation, error handling, and upsert behavior

✅ **Email Sending API** (`tests/unit/api/email/send-week.test.ts`)
- 15 tests with 100% line coverage
- Covers authentication, email sending, logging, and content

✅ **Participant CRUD API** (`tests/unit/api/participants/route.test.ts`)
- 16 tests with 100% line coverage
- Covers GET/POST, authentication, validation, and duplicate handling

## Next Steps

1. **Test 4:** Participant Update/Delete API (`tests/unit/api/participants/[id]/route.test.ts`)
2. **Test 5:** My Reviews Dashboard API
3. See `TESTING_IMPLEMENTATION_STATUS.md` for full plan
4. Run `npm run test:coverage` to see current coverage

## Getting Help

- Vitest docs: https://vitest.dev
- React Testing Library: https://testing-library.com/react
- Jest DOM matchers: https://github.com/testing-library/jest-dom
