# Error Monitoring & Structured Logging - Setup Guide

## 🎯 What We Built

A complete error monitoring and structured logging system that provides real-time visibility into production errors and application behavior.

### ✅ Features Implemented

**1. Sentry Integration**
- Real-time error tracking and alerting
- Automatic error capturing for both client and server
- Session replay for debugging user issues
- Performance monitoring and tracing
- Free tier: 5,000 events/month

**2. Structured Logging**
- Consistent log format across the application
- Contextual logging with request IDs
- Log levels: DEBUG, INFO, WARN, ERROR
- Automatic Sentry integration for errors
- Development and production modes

**3. Error Boundaries**
- React error boundaries catch component errors
- Graceful fallback UI for users
- Automatic error reporting to Sentry
- Development mode shows error details

**4. API Route Logging**
- Request ID tracking for correlation
- Structured error context
- Email send tracking and debugging
- Failed email diagnostics

---

## 🚀 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
├─────────────────────────────────────────────────────────┤
│  React Components  │  API Routes  │  Server Functions   │
│  (Error Boundary)  │  (Logger)    │  (Logger)           │
└──────────┬──────────┴──────┬───────┴──────────┬─────────┘
           │                 │                   │
           └────────┬────────┴────────┬──────────┘
                    │                 │
           ┌────────▼─────────────────▼─────────┐
           │     Structured Logger               │
           │  - Format messages                  │
           │  - Add context & metadata           │
           │  - Route to appropriate outputs     │
           └────────┬────────────────┬───────────┘
                    │                │
        ┌───────────▼─────┐  ┌──────▼──────────┐
        │   Console       │  │   Sentry        │
        │   (Development) │  │   (Production)  │
        └─────────────────┘  └─────────────────┘
```

---

## 📋 Setup Instructions

### Step 1: Create Sentry Account (Optional but Recommended)

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for free account (5,000 events/month)
3. Create a new project:
   - Platform: **Next.js**
   - Name: **album-club-manager** (or your choice)
4. Copy your **DSN** (looks like: `https://abc123@o123.ingest.sentry.io/456`)

### Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
# Error Monitoring (Sentry) - Optional
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@sentry.io/your-project-id
```

**Note:** Sentry is optional. The app works without it (logs to console only).

### Step 2b: Keep DSN Consistent Across Configs

This repo initializes Sentry in multiple places (client, server, edge, instrumentation). Make sure all of them point to the same project:

- `sentry.client.config.ts` uses `NEXT_PUBLIC_SENTRY_DSN`
- `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation-client.ts` currently hardcode a DSN

If you switch projects, update the hardcoded DSNs or (recommended) change them to use `process.env.NEXT_PUBLIC_SENTRY_DSN` so there is a single source of truth.

### Step 3: Verify Installation

```bash
# Build should succeed
npm run build

# Development mode
npm run dev
```

### Step 4: Configure Sentry Project Settings (In Sentry Dashboard)

**Recommended Settings:**

1. **Alerts** → **Alert Rules**:
   - Create rule: "Email on new issues"
   - Conditions: When event is first seen
   - Action: Send email to you

2. **Performance**:
   - Enable if you want performance monitoring
   - Sample rate: 10% (free tier friendly)

3. **Session Replay**:
   - Already configured in code
   - 10% session sampling
   - 100% error session sampling

---

## 🔧 Usage Guide

### Using the Logger in Code

#### Basic Logging

```typescript
import { logger } from "@/lib/logger";

// Info level
logger.info("User logged in", { userId: "123", email: "user@example.com" });

// Warning level
logger.warn("API rate limit approaching", { remaining: 10, limit: 100 });

// Error level (automatically sent to Sentry in production)
logger.error("Database connection failed",
  { database: "postgres", host: "db.example.com" },
  new Error("Connection timeout")
);
```

#### API Route Logging with Request ID

```typescript
import { createApiLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const logger = createApiLogger(requestId);

  try {
    logger.info("Request received", { endpoint: "/api/data" });

    // Your code here

    logger.info("Request completed successfully", { duration: "125ms" });
    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error("Request failed",
      { endpoint: "/api/data" },
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

#### Adding Breadcrumbs for Context

```typescript
import { logger } from "@/lib/logger";

// Add breadcrumbs to track user journey before an error
logger.addBreadcrumb("User clicked submit button", "ui.click", {
  buttonId: "submit-review",
  formValid: true
});

logger.addBreadcrumb("Validating form data", "validation", {
  fieldCount: 5,
  hasErrors: false
});

// If an error occurs, breadcrumbs are sent to Sentry for context
```

#### Setting User Context

```typescript
import { logger } from "@/lib/logger";

// Set user context (appears in Sentry for all subsequent errors)
logger.setUser("user-123");

// Clear user context (e.g., on logout)
logger.clearUser();
```

---

## 📊 What Gets Logged

### Development Mode
- **ALL** log levels to console (DEBUG, INFO, WARN, ERROR)
- Color-coded output
- Full error stack traces
- Sentry disabled (optional)

### Production Mode
- **ONLY** ERROR and WARN to console
- **ERROR** and **WARN** sent to Sentry
- Structured JSON format
- PII redaction in session replays

### Log Format

```typescript
{
  timestamp: "2025-12-27T10:30:00.000Z",
  level: "error",
  message: "Failed to send email",
  context: {
    weekNumber: 5,
    participantEmail: "user@example.com",
    requestId: "abc-123-def-456"
  },
  error: Error object
}
```

---

## 🛡️ Error Boundary

Automatically wraps your entire app (in `app/layout.tsx`):

```tsx
<ErrorBoundary>
  <Toaster />
  {children}
</ErrorBoundary>
```

**What it does:**
- Catches React component errors
- Shows user-friendly fallback UI
- Sends error to Sentry with component stack
- Provides "Reload Page" button
- Shows error details in development mode

**Custom Fallback UI:**

```tsx
<ErrorBoundary fallback={<YourCustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

---

## 🔍 Monitoring in Sentry

### Viewing Errors

1. Go to **Issues** tab in Sentry
2. See all errors grouped by type
3. Click on an issue to see:
   - Error message and stack trace
   - User context (if set)
   - Breadcrumbs (user journey)
   - Request context
   - Session replay (if available)

### Example Error in Sentry

```
Error: Failed to send email
  at sendEmail (api/email/send-week/route.ts:420)
  at POST (api/email/send-week/route.ts:450)

Context:
  - weekNumber: 5
  - requestId: abc-123-def-456
  - participantEmail: user@example.com

Breadcrumbs:
  1. [10:29:55] Email send request received
  2. [10:29:56] Participants loaded (count: 12)
  3. [10:29:57] Sending emails for week 5
  4. [10:29:58] Failed to send email

Tags:
  - environment: production
  - endpoint: /api/email/send-week
```

---

## 🧪 Testing Error Monitoring

### Test Error Boundary

Create a test component that throws an error:

```tsx
// app/test-error/page.tsx
"use client";

export default function TestErrorPage() {
  return (
    <button onClick={() => { throw new Error("Test error boundary!"); }}>
      Trigger Error
    </button>
  );
}
```

Visit `/test-error` and click the button. You should see:
1. Error boundary fallback UI
2. Error in Sentry (if configured)

### Test API Logging

```bash
# Should log request details
curl -X POST http://localhost:3000/api/email/send-week \
  -H "Content-Type: application/json" \
  -d '{"weekNumber": 999}'

# Check console for structured logs
# Check Sentry for "Week not found" error
```

---

## 📝 Files Modified/Created

**New Files:**
- `sentry.client.config.ts` - Client-side Sentry config
- `sentry.server.config.ts` - Server-side Sentry config
- `sentry.edge.config.ts` - Edge runtime Sentry config
- `lib/logger.ts` - Structured logging utility
- `components/ErrorBoundary.tsx` - React error boundary
- `ERROR_MONITORING_SETUP.md` - This documentation

**Modified Files:**
- `app/layout.tsx` - Added error boundary wrapper
- `app/api/email/send-week/route.ts` - Added structured logging
- `.env.example` - Added NEXT_PUBLIC_SENTRY_DSN
- `package.json` - Added @sentry/nextjs dependency

---

## 🎯 Best Practices

### DO:
✅ Use appropriate log levels (don't log everything as ERROR)
✅ Add context to logs (request IDs, user IDs, etc.)
✅ Use structured logging (objects, not string concatenation)
✅ Set user context for authenticated requests
✅ Add breadcrumbs for complex flows
✅ Catch and log errors at API boundaries

### DON'T:
❌ Log sensitive data (passwords, tokens, credit cards)
❌ Log in tight loops (will exhaust Sentry quota)
❌ Use console.log directly (use logger instead)
❌ Ignore errors silently
❌ Log entire request/response bodies (use summaries)

---

## 🚨 Common Issues

### Issue: Sentry not receiving errors

**Solution:**
1. Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify environment is "production" or set debug mode:
   ```typescript
   // In sentry.*.config.ts
   debug: true
   ```
3. Check Sentry project settings → Data Filters (ensure errors aren't filtered)

### Issue: Client errors show up but server/edge errors do not (or vice versa)

**Solution:**
1. Confirm DSN matches across `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation-client.ts`
2. If you use env vars, ensure `NEXT_PUBLIC_SENTRY_DSN` is set in local and production environments

### Issue: Too many events (quota exceeded)

**Solution:**
1. Reduce `tracesSampleRate` in Sentry config (default: 1.0 → 0.1)
2. Add filters in `beforeSend`:
   ```typescript
   beforeSend(event) {
     // Filter out certain errors
     if (event.message?.includes('AbortError')) {
       return null;
     }
     return event;
   }
   ```

### Issue: Session replays not working

**Solution:**
1. Check browser privacy settings (some blockers prevent replays)
2. Verify `replaysSessionSampleRate` > 0 in config
3. Session replays only work on client-side errors

---

## 💰 Sentry Free Tier Limits

- **5,000 errors/month** (resets monthly)
- **Unlimited projects**
- **90 days data retention**
- **1 team member**
- **Session replay**: 50 replays/month
- **Performance monitoring**: 10k transactions/month

**Staying within limits:**
- Use appropriate sample rates
- Filter out noisy errors
- Monitor usage in Sentry dashboard

---

## 📈 Metrics & Alerts

### Recommended Sentry Alerts

1. **New Issue Alert**
   - When: First seen
   - Action: Email to admin

2. **High Volume Alert**
   - When: More than 100 events in 1 hour
   - Action: Email to admin

3. **Regression Alert**
   - When: Resolved issue reappears
   - Action: Email to admin

---

## ✅ Success Criteria

System is working correctly when:

1. ✅ Errors appear in Sentry dashboard
2. ✅ Error boundary shows fallback UI for React errors
3. ✅ API logs include request IDs
4. ✅ Failed emails are logged with context
5. ✅ Development mode shows all logs in console
6. ✅ Production mode only logs errors/warnings
7. ✅ Session replays capture user interactions before errors

---

## 🔗 Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Logger API**: See `lib/logger.ts` for full API
- **Error Boundary**: See `components/ErrorBoundary.tsx`

---

**Status:** ✅ Fully implemented and ready for production

**Last Updated:** 2025-12-27
