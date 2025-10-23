# Credit System Documentation

## Overview

The credit system manages user credits for aviation SaaS actions. Each action costs exactly 1 credit, regardless of the user's plan. Plans control monthly credit replenishment and limits.

## Data Model

### Entities

```
User (Supabase Auth)
├── id (auth UID)
└── metadata

Subscription
├── id (uuid, pk)
├── userId (fk to User.id)
├── plan (FREE|PRO|BUSINESS)
├── status (ACTIVE|PAST_DUE|CANCELED)
├── renewsAt (timestamptz)
├── stripeCustomerId (string|null)
├── stripeSubId (string|null)
├── createdAt
└── updatedAt

CreditBalance
├── userId (pk, fk to User.id)
├── credits (int, default 0)
└── updatedAt

CreditLedger (append-only)
├── id (uuid, pk)
├── userId (fk to User.id)
├── delta (int: -1 for charge, +N for grant)
├── reason (ACTION|MONTHLY_TOPUP|MANUAL_ADJUST|PURCHASE|REFUND|ADMIN_FIX)
├── actionType (AIRCRAFT_LOOKUP|VIEW_FLIGHT_HISTORY|BROWSE_FLIGHT|BROWSE_AIRPORT|UNKNOWN)
├── refId (string|null, external correlation)
├── metadata (jsonb)
└── createdAt

UsageEvent (for idempotency)
├── id (uuid, pk)
├── userId (fk to User.id)
├── actionType (enum)
├── idempotencyKey (unique)
├── cost (int, default 1)
└── createdAt
```

### Constraints

- `CreditBalance.credits >= 0` (enforced by application logic)
- `UsageEvent.idempotencyKey` unique
- Foreign keys with cascade delete where appropriate
- Indexes on `CreditLedger.userId`, `UsageEvent.userId`

## Credit Flow

### Monthly Top-up Process

1. **Cron Job**: Daily check for subscriptions where `renewsAt <= now()`
2. **Credit Grant**: Grant credits based on plan:
   - FREE: 30 credits
   - PRO: 500 credits
   - BUSINESS: 3000 credits
3. **Ledger Entry**: Create `CreditLedger` entry with `reason: MONTHLY_TOPUP`
4. **Update Balance**: Increment `CreditBalance.credits`
5. **Renewal Date**: Update `Subscription.renewsAt` to next month

### Action Charge Process

1. **Idempotency Check**: Look up `UsageEvent` by `idempotencyKey`
2. **If Exists**: Return current balance (no charge)
3. **If Not Exists**:
   - Check `CreditBalance.credits >= 1`
   - If insufficient: throw `InsufficientCreditsError`
   - If sufficient: proceed with transaction
4. **Transaction**:
   - Create `UsageEvent` with `idempotencyKey`
   - Create `CreditLedger` entry with `delta: -1`, `reason: ACTION`
   - Update `CreditBalance` with `credits = credits - 1`
5. **Return**: New balance

## API Usage

### Wrapping an Action with Credit Charging

```typescript
import { withCreditCharge } from "@/lib/withCreditCharge";
import { ActionType } from "@prisma/client";

export const POST = withCreditCharge(
  ActionType.AIRCRAFT_LOOKUP,
  async ({ request, userId }) => {
    const body = await request.json();
    const { registration } = body;

    // Your existing logic here
    const aircraftData = await fetchAircraftData(registration);

    return {
      success: true,
      data: aircraftData,
    };
  }
);
```

### Response Format

All credit-charged endpoints return:

```json
{
  "data": {
    /* your response data */
  },
  "credits": 42 // remaining credit balance
}
```

### Guest Quota System

Anonymous users (not authenticated) are limited to 3 requests per IP address over a 24-hour rolling window. Once the quota is exceeded, users must authenticate to access the FREE plan (5 credits/day).

### Guest Quota Features

- **IP-based Tracking**: Uses client IP address for quota enforcement
- **24-hour Rolling Window**: TTL of 86400 seconds (24 hours)
- **Redis Storage**: Uses Upstash Redis with in-memory fallback for development
- **Automatic Detection**: Detects authentication status and applies appropriate limits
- **Seamless Transition**: Authenticated users bypass guest quota and use credit system

### Guest Quota Implementation

```typescript
import { withActionAccess } from "@/lib/withActionAccess";

// Combined access control (credits for authenticated, guest quota for anonymous)
export const POST = withActionAccess(
  ActionType.AIRCRAFT_LOOKUP,
  async (request: NextRequest) => {
    // Your API logic here
    return NextResponse.json({ success: true, data: result });
  }
);
```

### Guest Quota Behavior

- **Anonymous Users**: 3 requests per IP per 24h
- **Authenticated Users**: Use credit system (FREE = 5/day, PRO = 500/month, etc.)
- **Quota Exceeded**: Returns 429 with login prompt
- **Response Headers**: Includes `X-Guest-Remaining`, `X-Guest-Used`, `X-Guest-Limit`
- **Response Data**: Includes `guestRemaining`, `guestUsed`, `isGuest` fields

### IP Detection

The system detects client IP from headers in order of priority:

1. `x-forwarded-for` (first IP in comma-separated list)
2. `x-real-ip`
3. Development fallback to `127.0.0.1`

### Redis Configuration

```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

If Redis is unavailable, the system falls back to in-memory storage with TTL.

## ABD Usage Policy

Every request to the AircraftBaseData API costs 1 credit. Requests are wrapped with the `withCreditChargeABD()` middleware to ensure consistent usage tracking and idempotent billing.

#### Specialized ABD Middleware

```typescript
import {
  withCreditChargeABD,
  withCreditChargeFlightHistory,
  withCreditChargeFlightBrowse,
  withCreditChargeAirportBrowse,
} from "@/lib/withCreditChargeABD";

// Generic ABD wrapper
export const POST = withCreditChargeABD(
  ActionType.AIRCRAFT_LOOKUP,
  async (request: NextRequest) => {
    // Your ABD API logic here
    return Response.json({ success: true, data: result });
  }
);

// Specialized wrappers
export const GET = withCreditChargeFlightHistory(async (request) => {
  /* ... */
});
export const GET = withCreditChargeFlightBrowse(async (request) => {
  /* ... */
});
export const GET = withCreditChargeAirportBrowse(async (request) => {
  /* ... */
});
```

#### ABD Credit Charging Features

- **Automatic Authentication**: Validates Supabase session
- **Idempotent Billing**: Prevents duplicate charges for the same request
- **Credit Validation**: Returns 402 if insufficient credits
- **Usage Logging**: All requests logged in CreditLedger and UsageEvent
- **Debug Headers**: Response includes `X-Credits-Remaining` and `X-Credits-Charged`
- **Server Logging**: Console logs for monitoring ABD usage

#### ABD Endpoints

All ABD-related endpoints automatically charge 1 credit:

- `/api/aircraft/lookup` - Aircraft data lookup
- `/api/flights/history` - Flight history queries
- `/api/flights/browse` - Flight browsing
- `/api/airports/browse` - Airport information

### Error Handling

```json
// Insufficient credits (402)
{
  "error": "Insufficient credits",
  "code": "INSUFFICIENT_CREDITS",
  "credits": 0
}

// Unauthorized (401)
{
  "error": "Unauthorized"
}
```

## API Endpoints

### GET /api/credits/balance

Returns current credit balance for authenticated user.

**Response:**

```json
{
  "credits": 42
}
```

### GET /api/credits/history

Returns usage history with pagination.

**Query Parameters:**

- `limit` (optional): Number of items to return (default: 100)
- `cursor` (optional): Pagination cursor

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "delta": -1,
      "reason": "ACTION",
      "actionType": "AIRCRAFT_LOOKUP",
      "refId": "aircraft-123",
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "nextCursor": "uuid-or-null"
}
```

### POST /api/credits/charge

Manually charge a credit (mainly for testing).

**Body:**

```json
{
  "actionType": "AIRCRAFT_LOOKUP",
  "idempotencyKey": "optional-key",
  "refId": "optional-reference",
  "metadata": {}
}
```

**Response:**

```json
{
  "newBalance": 41
}
```

### POST /api/credits/grant (Admin Only)

Grant credits to a user.

**Body:**

```json
{
  "userId": "user-id",
  "amount": 100,
  "reason": "MANUAL_ADJUST",
  "metadata": {
    "note": "Customer service adjustment"
  }
}
```

## Stripe Integration

### Webhook Events

#### customer.subscription.created/updated

- Maps Stripe plan to internal plan
- Updates `Subscription.plan`, `status`, `renewsAt`
- Sets `stripeSubId`

#### invoice.payment_succeeded

- Checks for credit pack purchases
- Grants credits with `reason: PURCHASE`
- Links to Stripe invoice ID

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Admin Tools

### User Search

- Search by email or user ID
- View current balance and subscription
- Access to credit management

### Credit Management

- Grant credits with reason
- View audit trail
- Manual adjustments

## Error Codes

| Code                   | Description                   | HTTP Status |
| ---------------------- | ----------------------------- | ----------- |
| `INSUFFICIENT_CREDITS` | User has no credits remaining | 402         |
| `UNAUTHORIZED`         | User not authenticated        | 401         |
| `ADMIN_REQUIRED`       | Admin access needed           | 403         |

## Concurrency & Safety

### Atomic Operations

- All credit operations use database transactions
- Row-level locking prevents race conditions
- Idempotency keys prevent double-charging

### Edge Cases

1. **Multiple Sub-calls**: Charge only once per user-visible action
2. **Stripe Plan Changes**: No retroactive credits; next renewal applies new plan
3. **Failed External API**: Show toast notification, log `ADMIN_FIX` entry

## Testing

### Unit Tests

```bash
npm test src/lib/__tests__/credits.test.ts
```

### Integration Tests

```bash
npm test src/app/api/__tests__/credits.test.ts
```

### Seed Data

```bash
npm run db:seed
```

Creates test users:

- User A: FREE plan, 0 credits
- User B: PRO plan, 100 credits
- Admin user: BUSINESS plan, 1000 credits

## Monitoring

### Key Metrics

- Credit balance distribution
- Usage patterns by action type
- Failed charges (insufficient credits)
- Monthly top-up success rate

### Alerts

- High failure rate for credit charges
- Failed monthly top-ups
- Unusual credit grant patterns

## Migration

### Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migration
npm run db:migrate

# Seed test data
npm run db:seed
```

### Environment Setup

```bash
# Database
DATABASE_URL="postgresql://..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```
