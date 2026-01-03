# Testing Guide

This document provides a comprehensive guide to testing in the Album Club Manager project.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Mock Data](#mock-data)
- [Best Practices](#best-practices)
- [Coverage Requirements](#coverage-requirements)
- [Continuous Integration](#continuous-integration)

## Overview

The Album Club Manager uses a modern testing infrastructure built on Vitest, React Testing Library, and Mock Service Worker (MSW). Our testing strategy focuses on:

1. **API Route Tests** - Core business logic validation
2. **Component Tests** - UI behavior and user interactions
3. **Integration Tests** - End-to-end user flows
4. **Utility Tests** - Helper functions and utilities

**Current Status:**
- 92 total tests
- 82 passing tests
- 6 test files
- 100% line coverage on tested routes

## Testing Stack

### Core Dependencies

```json
{
  "vitest": "^4.0.16",
  "@vitest/ui": "^4.0.16",
  "@vitest/coverage-v8": "^4.0.16",
  "@testing-library/react": "^16.0.1",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.5.2",
  "jsdom": "^25.0.1",
  "msw": "^2.6.8"
}
```

### Configuration Files

- **vitest.config.ts** - Test runner configuration
- **tests/setup.ts** - Global test setup and mocks
- **tests/mocks/server.ts** - MSW server configuration
- **tests/mocks/handlers/** - API mock handlers

## Running Tests

```bash
# Run tests in watch mode (default)
npm test

# Run all tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Open visual UI
npm run test:ui

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/api/reviews/submit.test.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest'

describe('MyFeature', () => {
  it('does something correctly', () => {
    const result = myFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### API Route Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: vi.fn(),
}))

// Import after mocking
import { POST } from '@/app/api/my-route/route'
import { createServerClient } from '@/lib/supabaseClient'

const mockCreateServerClient = vi.mocked(createServerClient)

describe('POST /api/my-route', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      // Add other methods as needed
    }

    mockCreateServerClient.mockReturnValue(mockSupabase)
  })

  it('handles valid request', async () => {
    mockSupabase.insert.mockResolvedValueOnce({
      data: { id: 1, name: 'Test' },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/my-route', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)

    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

## Test Structure

Our tests are organized by type and location:

```
tests/
├── setup.ts                     # Global test setup
├── mocks/
│   ├── server.ts                # MSW server configuration
│   ├── handlers/
│   │   ├── supabase.ts          # Supabase API mocks
│   │   └── resend.ts            # Email API mocks
│   ├── data/
│   │   ├── participants.ts      # Sample participant data
│   │   ├── reviews.ts           # Sample review data
│   │   └── weeks.ts             # Sample week data
│   └── factories/
│       ├── participantFactory.ts # Generate test participants
│       ├── reviewFactory.ts      # Generate test reviews
│       └── weekFactory.ts        # Generate test weeks
└── unit/
    ├── api/
    │   ├── reviews/
    │   │   └── submit.test.ts   # Review submission tests
    │   ├── email/
    │   │   └── send-week.test.ts # Email sending tests
    │   ├── participants/
    │   │   ├── route.test.ts     # Participant CRUD tests
    │   │   └── [id]/
    │   │       └── route.test.ts # Participant update/delete tests
    │   └── my-reviews/
    │       └── route.test.ts     # Dashboard API tests
    └── lib/
        └── utils/
            └── names.test.ts     # Utility function tests
```

## Mock Data

### Using Factory Functions

Factory functions generate realistic test data with sensible defaults:

```typescript
import { createMockParticipant } from '@/tests/mocks/factories/participantFactory'
import { createMockReview } from '@/tests/mocks/factories/reviewFactory'
import { createMockWeek } from '@/tests/mocks/factories/weekFactory'

// Generate with defaults
const participant = createMockParticipant()

// Override specific fields
const curator = createMockParticipant({
  name: 'John Doe',
  is_curator: true,
})

// Generate reviews
const review = createMockReview({
  participant_id: curator.id,
  rating: 8.5,
  album_type: 'contemporary',
})

// Generate weeks
const week = createMockWeek({
  week_number: 1,
  response_deadline: '2024-01-01T00:00:00Z',
})
```

### Sample Data

Pre-defined sample data is available for common scenarios:

```typescript
import { mockParticipants } from '@/tests/mocks/data/participants'
import { mockReviews } from '@/tests/mocks/data/reviews'
import { mockWeeks } from '@/tests/mocks/data/weeks'
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
expect(component.state.count).toBe(1)

// ✅ Good - Testing user-visible behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => { ... })

// ✅ Good
it('returns 404 when participant not found', () => { ... })
```

### 3. Arrange, Act, Assert Pattern

```typescript
it('creates new participant with valid data', async () => {
  // Arrange
  const newParticipant = createMockParticipant({ name: 'New User' })
  mockSupabase.insert.mockResolvedValueOnce({ data: newParticipant, error: null })

  // Act
  const request = new NextRequest('http://localhost/api/participants', {
    method: 'POST',
    body: JSON.stringify({ name: 'New User', email: 'new@test.com' }),
  })
  const response = await POST(request)
  const data = await response.json()

  // Assert
  expect(response.status).toBe(201)
  expect(data.data.name).toBe('New User')
})
```

### 4. Clean Up After Each Test

```typescript
import { beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
  // Setup common test state
})

afterEach(() => {
  vi.restoreAllMocks()
  // Clean up resources
})
```

### 5. Mock at the Right Level

```typescript
// ❌ Bad - Mocking too low level
vi.mock('node:crypto')

// ✅ Good - Mock at the service boundary
vi.mock('@/lib/supabaseClient')
```

### 6. Test Edge Cases

```typescript
describe('Validation', () => {
  it('accepts valid email', () => { ... })
  it('rejects empty email', () => { ... })
  it('rejects whitespace-only email', () => { ... })
  it('rejects invalid email format', () => { ... })
  it('trims whitespace from email', () => { ... })
})
```

### 7. Use Type-Safe Mocks

```typescript
// ✅ Good - Properly typed mock
const mockCreateServerClient = vi.mocked(createServerClient)
mockCreateServerClient.mockReturnValue(mockSupabase)
```

## Coverage Requirements

We aim for the following coverage thresholds:

- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

Current coverage is configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  thresholds: {
    statements: 60,
    branches: 60,
    functions: 60,
    lines: 60,
  },
}
```

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions.

### CI Pipeline

1. **Checkout code**
2. **Setup Node.js** (18.x and 20.x)
3. **Install dependencies**
4. **Run linter**
5. **Run type check**
6. **Run tests with coverage**
7. **Upload coverage to Codecov**
8. **Comment coverage on PR**

### Workflow File

See [.github/workflows/test.yml](.github/workflows/test.yml) for the complete configuration.

## Common Testing Patterns

### Testing Supabase Queries

```typescript
// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

// Simple query
mockSupabase.single.mockResolvedValueOnce({
  data: mockParticipant,
  error: null,
})

// Chained query
mockSupabase.select.mockReturnValueOnce(mockSupabase)
mockSupabase.order.mockResolvedValueOnce({
  data: [mockParticipant1, mockParticipant2],
  error: null,
})
```

### Testing Authentication

```typescript
import { requireAuth } from '@/lib/auth/utils'

vi.mock('@/lib/auth/utils', () => ({
  requireAuth: vi.fn(),
}))

// Mock successful auth
mockRequireAuth.mockResolvedValueOnce({
  user: { id: 'user-1', email: 'user@test.com' },
})

// Mock auth failure
mockRequireAuth.mockRejectedValueOnce(new Error('Unauthorized'))
```

### Testing Error Handling

```typescript
it('returns 500 when database error occurs', async () => {
  mockSupabase.insert.mockResolvedValueOnce({
    data: null,
    error: new Error('Database connection failed'),
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(500)
  expect(data.error).toContain('Database connection failed')
})
```

### Testing Next.js 15+ Async Params

```typescript
// API routes with async params
const context = {
  params: Promise.resolve({ id: 'participant-1' })
}

const response = await PUT(request, context)
```

## Troubleshooting

### Tests Timing Out

Increase timeout in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 20000, // 20 seconds
}
```

### Mock Not Working

Ensure mocks are declared before imports:

```typescript
// ❌ Bad
import { POST } from '@/app/api/my-route/route'
vi.mock('@/lib/supabaseClient')

// ✅ Good
vi.mock('@/lib/supabaseClient')
import { POST } from '@/app/api/my-route/route'
```

### Supabase Query Chain Not Working

Ensure each method in the chain returns `this` or a resolved value:

```typescript
mockSupabase.select.mockReturnValueOnce(mockSupabase) // Returns this for chaining
mockSupabase.order.mockReturnValueOnce(mockSupabase)  // Returns this for chaining
mockSupabase.eq.mockResolvedValueOnce({ data, error }) // Returns final result
```

### Coverage Not Matching Expectations

Check for:
- Untested error paths
- Missing branch coverage (if/else statements)
- Uncovered edge cases

## Additional Resources

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [MSW Documentation](https://mswjs.io)
- [Testing Implementation Status](./TESTING_IMPLEMENTATION_STATUS.md)
- [Testing Quick Start](./TESTING_QUICK_START.md)

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure tests pass locally before committing
3. Maintain or improve coverage percentages
4. Follow existing test patterns and structure
5. Update documentation if adding new testing patterns

---

**Need help?** Check the [TESTING_QUICK_START.md](./TESTING_QUICK_START.md) guide or review existing test files for examples.
