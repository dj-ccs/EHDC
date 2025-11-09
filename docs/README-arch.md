# Brother Nature – Backend Architecture

## Overview

Brother Nature's backend (EHDC Core / Pillar IV Implementation Lab) is a **Fastify + Prisma + Supabase** TypeScript stack designed for performance, modularity, and clear developer experience.

This document provides a comprehensive architectural overview of the system.

---

## 1. Core Components

| Component | Purpose | Key File(s) |
|-----------|---------|-------------|
| **Fastify** | High-performance Node.js framework providing routing, middleware, and plugin support | `src/index.ts` |
| **Prisma ORM** | Type-safe database ORM managing schema, migrations, and client queries | `prisma/schema.prisma` |
| **Supabase (PostgreSQL)** | Managed PostgreSQL database for persistence and authentication storage | `.env`, `schema.prisma` |
| **JWT Authentication** | Fastify JWT for user identity and session control | Configured in `src/index.ts` |
| **Rate Limiting + CORS + Helmet** | Security and API hygiene plugins | Registered via `setupPlugins()` |
| **Zod Validation** | TypeScript-first schema validation for request payloads | `src/utils/validation.ts` |
| **XRPL Integration** | Blockchain integration for wallet verification and token rewards | `src/services/xrpl.service.ts` |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  (Web App, Mobile App, CLI Tools, Third-party Integrations)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fastify Server                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Middleware Stack                       │  │
│  │  - Helmet (Security Headers)                             │  │
│  │  - CORS (Cross-Origin Resource Sharing)                 │  │
│  │  - JWT (Authentication)                                  │  │
│  │  - Rate Limiter (100 req/15min)                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Route Handlers                         │  │
│  │  - /health           (Health check)                      │  │
│  │  - /api/auth         (Authentication)                    │  │
│  │  - /api/communities  (Community management)              │  │
│  │  - /api/posts        (Threaded discussions)              │  │
│  │  - /api/synthesis    (AI synthesis triggers)             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Business Logic                          │  │
│  │  - Authentication (JWT, wallet verification)             │  │
│  │  - Authorization (role-based access control)             │  │
│  │  - Validation (Zod schemas)                              │  │
│  │  - XRPL Service (signature verification, rewards)        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Prisma ORM                               │
│  (Type-safe query builder, migrations, schema management)      │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                     │
           ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│  Supabase Postgres  │              │    XRPL Network     │
│                     │              │                     │
│ - Users             │              │ - Wallet Verify     │
│ - Communities       │              │ - Token Rewards     │
│ - Posts             │              │ - Transactions      │
│ - Synthesis         │              │                     │
│ - Challenges        │              │                     │
└─────────────────────┘              └─────────────────────┘
   (Persistent Data)                  (Blockchain Layer)
```

---

## 3. Execution Flow

### Server Startup Sequence

```typescript
// src/index.ts - Simplified startup flow

1. Load environment variables (.env)
   └─ DATABASE_URL, DIRECT_URL, JWT_SECRET, XRPL_SERVER, etc.

2. Initialize Prisma client
   └─ Connect to Supabase PostgreSQL
   └─ Enable query logging in development

3. Initialize Fastify server
   └─ Configure logger (pino with pretty-print in dev)

4. Register plugins (setupPlugins)
   ├─ @fastify/helmet (security headers)
   ├─ @fastify/cors (CORS handling)
   ├─ @fastify/jwt (JWT auth)
   └─ @fastify/rate-limit (abuse prevention)

5. Decorate Fastify with Prisma
   └─ Makes `fastify.prisma` available in all routes

6. Register health check route
   └─ GET /health (no auth required)

7. Register API routes (setupRoutes)
   ├─ /api/auth (signup, login, wallet challenge/verify)
   ├─ /api/communities (CRUD for communities)
   ├─ /api/posts (threaded discussions)
   └─ /api/synthesis (AI synthesis triggers)

8. Connect to database
   └─ await prisma.$connect()

9. Start HTTP server
   └─ Listen on configured port (default 3000)

10. Setup graceful shutdown handlers
    └─ SIGTERM, SIGINT → close DB, close server
```

---

## 4. Database Layer

### Schema Design Philosophy

The database schema follows these principles:

1. **Normalized Structure** - Minimize data duplication
2. **Referential Integrity** - Foreign keys with cascade rules
3. **Type Safety** - Prisma generates TypeScript types from schema
4. **Performance** - Strategic indexes on frequently queried fields
5. **Scalability** - Connection pooling via Supabase

### Connection Strategy

```env
# Dual connection string approach

# Runtime queries (app)
DATABASE_URL="postgresql://...@host:6543/postgres?pgbouncer=true"
# Uses connection pooler for high concurrency

# Migrations (CLI)
DIRECT_URL="postgresql://...@host:5432/postgres"
# Direct connection required for schema changes
```

**Why Two URLs?**

- **DATABASE_URL (port 6543):** Connection pooler (pgbouncer)
  - Handles thousands of concurrent connections
  - Required for serverless/edge deployments
  - Cannot run migrations (no session state)

- **DIRECT_URL (port 5432):** Direct PostgreSQL
  - Required for `npx prisma db push` and `migrate dev`
  - Maintains session state for migrations
  - Used by Prisma automatically for CLI commands

### Database Schema Overview

```
User (Authentication & Profile)
├── id (CUID primary key)
├── email, username (unique)
├── passwordHash (bcrypt)
├── xrplWalletAddress (optional, unique)
├── role (USER | STEWARD | ADMIN)
└── Relations:
    ├── posts[] (author of posts)
    ├── communities[] (memberships)
    ├── synthesisCreated[] (triggered syntheses)
    ├── tokenRewards[] (received rewards)
    └── walletChallenges[] (verification challenges)

Community (Geographic Organization)
├── id (CUID)
├── country, region, category
├── slug (unique, URL-friendly)
├── isActive (soft delete flag)
└── Relations:
    ├── posts[] (community discussions)
    └── members[] (community memberships)

CommunityMember (Many-to-Many Join)
├── userId + communityId (composite unique)
├── role (MEMBER | MODERATOR | STEWARD)
└── Relations:
    ├── user (User)
    └── community (Community)

Post (Threaded Discussions)
├── id (CUID)
├── title (optional, top-level only)
├── content (markdown)
├── parentPostId (null for root, references parent)
├── threadDepth (0 for root, increments)
├── authorId (User FK)
├── communityId (Community FK)
└── Relations:
    ├── author (User)
    ├── community (Community)
    ├── parentPost (Post, self-reference)
    ├── replies[] (Post[], self-reference)
    └── synthesisArtifacts[] (generated summaries)

SynthesisArtifact (AI-Generated Summaries)
├── id (CUID)
├── title, summary
├── keyPoints (String[] - PostgreSQL array)
├── synthesisType (thread | community | topic)
├── aiModel (e.g., "claude-3.5-sonnet")
├── threadRootId (Post FK, optional)
├── createdById (User FK, steward who triggered)
└── Relations:
    ├── threadRoot (Post)
    └── createdBy (User)

TokenReward (XRPL Rewards)
├── id (CUID)
├── userId (User FK)
├── tokenType (EXPLORER | REGEN | GUARDIAN)
├── amount (string, decimal representation)
├── xrplTxHash (transaction hash, unique)
├── xrplDestination (recipient address)
├── status (PENDING | PROCESSING | CONFIRMED | FAILED)
└── Relations:
    └── user (User)

WalletChallenge (Cryptographic Verification)
├── id (CUID)
├── nonce (64-char hex string, unique)
├── message (challenge text to sign)
├── xrplAddress (wallet attempting to link)
├── userId (User FK)
├── isUsed, isVerified (status flags)
├── expiresAt (5-minute window)
└── Relations:
    └── user (User)
```

---

## 5. API Route Organization

Each module in `src/routes/` encapsulates a logical domain:

### Route Structure

```
src/routes/
├── auth.ts          → /api/auth/*
├── communities.ts   → /api/communities/*
├── posts.ts         → /api/posts/*
└── synthesis.ts     → /api/synthesis/*
```

### Authentication Routes (`auth.ts`)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/auth/signup` | POST | Create new user account | No |
| `/api/auth/login` | POST | Login and get JWT token | No |
| `/api/auth/wallet/challenge` | POST | Generate XRPL challenge | Yes |
| `/api/auth/wallet/verify` | POST | Verify XRPL signature | Yes |

**Flow:**
```
1. User POSTs to /signup with email, username, password
2. Server hashes password (bcrypt), creates User record
3. Returns success (no auto-login)

4. User POSTs to /login with email, password
5. Server verifies password hash
6. Server generates JWT token with user.id, email, username, role
7. Returns { token, user } for client storage
```

**Wallet Verification Flow:**
```
1. User POSTs to /wallet/challenge with xrplWalletAddress
2. Server generates 64-char hex nonce
3. Server creates WalletChallenge record (expires in 5 min)
4. Returns { nonce, message: "Verify ownership for Brother Nature..." }

5. Client signs message with XRPL wallet private key (using ripple-keypairs)
6. Client POSTs to /wallet/verify with nonce, signature, publicKey
7. Server validates nonce (not expired, not used)
8. Server verifies signature using ripple-keypairs.verify(messageHex, signature, publicKey)
   - Converts message to hex before verification
9. If valid: updates User.xrplWalletAddress, marks challenge as used
10. Returns success
```

### Community Routes (`communities.ts`)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/communities` | GET | List all active communities | No |
| `/api/communities` | POST | Create new community | STEWARD |
| `/api/communities/:slug` | GET | Get community details | No |
| `/api/communities/:slug` | PUT | Update community | STEWARD |

**Community Creation Flow:**
```
1. STEWARD POSTs to /communities with country, region, category, name
2. Server generates slug (e.g., "aus-deniliquin-soil-health")
3. Server creates Community record
4. Server auto-joins creator as CommunityMember with STEWARD role
5. Returns created community
```

### Post Routes (`posts.ts`)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/posts` | GET | List all posts (paginated) | No |
| `/api/posts` | POST | Create new post/reply | Yes |
| `/api/posts/community/:communityId` | GET | Get posts for community | No |
| `/api/posts/:postId` | GET | Get post with nested replies | No |
| `/api/posts/:postId` | PUT | Update post | Author |
| `/api/posts/:postId` | DELETE | Delete post (cascade) | Author |

**Threaded Post Creation:**
```
1. User POSTs to /posts with title, content, communityId, parentPostId?
2. Server verifies user is CommunityMember
3. If parentPostId: server calculates threadDepth = parent.threadDepth + 1
4. Server creates Post record
5. Returns created post with author details
```

**Reply Nesting:**
```
POST (Root, depth=0)
 ├─ POST (Reply, depth=1)
 │   ├─ POST (Nested Reply, depth=2)
 │   └─ POST (Nested Reply, depth=2)
 └─ POST (Reply, depth=1)
```

### Synthesis Routes (`synthesis.ts`)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/synthesis/trigger` | POST | Trigger AI synthesis | STEWARD |
| `/api/synthesis/thread/:threadRootId` | GET | Get syntheses for thread | No |
| `/api/synthesis/:artifactId` | GET | Get single synthesis | No |

**Synthesis Trigger Flow:**
```
1. STEWARD POSTs to /trigger with threadRootId, synthesisType
2. Server fetches root post + all nested replies recursively
3. Server generates synthesis (MVP: simple summary, future: Claude API)
4. Server creates SynthesisArtifact with keyPoints (String[] array)
5. Server awards EXPLORER tokens to thread author via XRPL
6. Returns synthesis artifact + reward details
```

---

## 6. Fastify Plugin Architecture

### Plugin Setup Pattern

```typescript
// src/index.ts

const setupPlugins = async () => {
  // Security headers (CSP, XSS protection)
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS (allow specified origins)
  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // JWT Authentication
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!
  });

  // Rate limiting (prevent abuse)
  await fastify.register(fastifyRateLimit, {
    max: 100,           // 100 requests
    timeWindow: '15 minutes'  // per 15 minutes
  });
};
```

### Key Plugins Explained

**1. @fastify/helmet**
- Adds security headers to every response
- Prevents XSS, clickjacking, MIME sniffing attacks
- Configurable CSP (Content Security Policy)

**2. @fastify/cors**
- Handles Cross-Origin Resource Sharing
- Allows web apps on different domains to call API
- Supports credentials (cookies, auth headers)

**3. @fastify/jwt**
- Generates and verifies JWT tokens
- Adds `request.jwtVerify()` and `reply.jwtSign()` methods
- Used by `authenticate` middleware

**4. @fastify/rate-limit**
- Prevents API abuse and DDoS
- Tracks requests per IP
- Returns 429 Too Many Requests when exceeded

---

## 7. Authentication & Authorization

### JWT Token Structure

```typescript
// Payload (signed into token)
{
  id: "clz123abc...",       // User CUID
  email: "user@example.com",
  username: "johndoe",
  role: "USER" | "STEWARD" | "ADMIN",
  iat: 1699564800,          // Issued at (Unix timestamp)
  exp: 1699651200           // Expires (24 hours later)
}
```

### Middleware Functions

**`authenticate` (src/middleware/auth.ts)**
```typescript
// Verifies JWT token exists and is valid
// Attaches decoded user to request.user
// Usage: { preHandler: authenticate }

fastify.post('/posts',
  { preHandler: authenticate },
  async (request, reply) => {
    // request.user is now available
    const userId = request.user.id;
  }
);
```

**`requireSteward` (src/middleware/auth.ts)**
```typescript
// Verifies user has STEWARD or ADMIN role
// Inherits from authenticate (checks token first)
// Usage: { preHandler: requireSteward }

fastify.post('/communities',
  { preHandler: requireSteward },
  async (request, reply) => {
    // Only STEWARD or ADMIN users reach here
  }
);
```

### Role-Based Access Control

```
USER (default)
└─ Can: Post, comment, view content
└─ Cannot: Create communities, trigger synthesis

STEWARD
└─ Can: Everything USER can + create communities, trigger synthesis
└─ Cannot: Manage users, system settings

ADMIN
└─ Can: Everything (full platform access)
```

---

## 8. XRPL Integration

> 📖 **For comprehensive XRPL integration documentation, see [XRPL-WALLET-VERIFICATION.md](./XRPL-WALLET-VERIFICATION.md)**

### XRPL Service (`src/services/xrpl.service.ts`)

Handles all XRPL network interactions:

**1. Wallet Signature Verification**
```typescript
verifyWalletSignature(message: string, signature: string, publicKey: string): boolean {
  // Uses ripple-keypairs.verify() instead of xrpl.verify()
  // (xrpl@3.1.0 does not export verify function)
  //
  // 1. Converts UTF-8 message to hex: Buffer.from(message, 'utf8').toString('hex')
  // 2. Verifies signature using ripple-keypairs cryptography
  // 3. Returns true if signature proves ownership of wallet
}
```

**Implementation Details:**
- Message must be converted to hex before verification
- Uses `ripple-keypairs` library for cryptographic operations
- Challenge-response pattern prevents replay attacks
- 5-minute expiry on all challenges

**2. Token Reward Distribution**
```typescript
async rewardVerifiedContribution(
  userId: string,
  postId: string,
  amount: string
): Promise<string> {
  // 1. Fetches user's xrplWalletAddress
  // 2. Creates TokenReward record (status: PENDING)
  // 3. Connects to XRPL testnet
  // 4. Prepares Payment transaction
  // 5. Signs and submits to ledger
  // 6. Updates TokenReward (status: CONFIRMED, adds xrplTxHash)
  // 7. Returns transaction hash
}
```

**Token Types:**
- **EXPLORER** - Discovery & Documentation rewards
- **REGEN** - Restoration & Recovery rewards
- **GUARDIAN** - Stewardship & Continuity rewards

### Testing Tools

**xrpl_helper.js** - Complete workflow test (challenge → sign → verify)
```bash
node xrpl_helper.js
```

**sign-message.js** - CLI message signing utility
```bash
node sign-message.js <SECRET> <MESSAGE>
```

### XRPL Documentation Standards

All XRPL-related integrations should follow these documentation patterns:

1. **System Components Table** - Define client, server, database, and XRPL layers
2. **Flow Diagram** - ASCII diagram showing request/response flow (~10 steps max)
3. **Implementation Notes** - Encoding, signature schemes, expiry, edge cases
4. **File Map** - Directory structure for the feature
5. **Security Considerations** - Secret handling, auth requirements, validation
6. **Testing Harness** - Scripts and instructions for local testing

See [XRPL-WALLET-VERIFICATION.md](./XRPL-WALLET-VERIFICATION.md) for the complete pattern.

---

## 9. Data Validation

### Zod Schema Validation

All request payloads are validated using Zod schemas defined in `src/utils/validation.ts`:

**Example: Create Post Schema**
```typescript
export const createPostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(50000),
  contentType: z.enum(['markdown', 'plain', 'html']).default('markdown'),
  communityId: z.string().cuid(),
  parentPostId: z.string().cuid().optional(),
});
```

**Usage in Route:**
```typescript
const body = createPostSchema.parse(request.body);
// If validation fails, throws ZodError
// If valid, body is typed as:
// { title?: string, content: string, contentType: 'markdown' | 'plain' | 'html', ... }
```

**Benefits:**
- Runtime validation + compile-time types
- Clear error messages for invalid data
- Self-documenting API contracts

---

## 10. Error Handling

### Standard Error Response Format

```typescript
{
  "error": "Error Type",
  "message": "Human-readable description",
  "details"?: any  // Optional, e.g., Zod validation errors
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request payload (validation error) |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

---

## 11. Logging Strategy

### Pino Logger (High Performance)

```typescript
// Development: Pretty-printed colored output
[14:22:20.075] INFO (78357): Connected to database
[14:22:20.132] INFO (78357): Server listening at http://0.0.0.0:3000

// Production: JSON logs for parsing/monitoring
{"level":30,"time":1699564820075,"pid":78357,"msg":"Connected to database"}
{"level":30,"time":1699564820132,"pid":78357,"msg":"Server listening at http://0.0.0.0:3000"}
```

### Log Levels

- **ERROR (50)** - System failures, unhandled exceptions
- **WARN (40)** - Degraded functionality, recoverable errors
- **INFO (30)** - Important state changes (startup, shutdown)
- **DEBUG (20)** - Detailed diagnostic information
- **TRACE (10)** - Very detailed diagnostic (query logs)

---

## 12. Testing Strategy

### Test Pyramid

```
       ╱────────╲
      ╱   E2E    ╲        (Few) - Full integration tests
     ╱────────────╲
    ╱ Integration  ╲      (Some) - API endpoint tests
   ╱────────────────╲
  ╱   Unit Tests     ╲    (Many) - Individual function tests
 ╱────────────────────╲
```

### Test Files

- `src/routes/*.test.ts` - API endpoint tests
- `src/services/*.test.ts` - Service layer unit tests
- `src/utils/*.test.ts` - Utility function tests

**Run tests:**
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # Generate coverage report
```

---

## 13. Performance Considerations

### Database Optimization

**Indexes:**
```prisma
model User {
  @@index([email])
  @@index([username])
  @@index([xrplWalletAddress])
}

model Post {
  @@index([communityId, createdAt])
  @@index([authorId])
  @@index([parentPostId])
}
```

**Connection Pooling:**
- Supabase provides pgbouncer (port 6543)
- Pools up to 200 connections
- Reduces latency for serverless deployments

**Query Optimization:**
- Use `select` to fetch only needed fields
- Use `include` instead of multiple queries
- Paginate large result sets (limit, skip)

### Response Time Targets

| Route Type | Target | Max Acceptable |
|------------|--------|----------------|
| Static content | <50ms | 100ms |
| Simple queries | <100ms | 200ms |
| Complex queries | <500ms | 1s |
| XRPL transactions | <5s | 10s |

---

## 14. Deployment Architecture

### Recommended Stack

**Option A: Vercel (Serverless)**
```
[Client] → [Vercel Edge Network]
           └─ [Serverless Functions]
              ├─ Node.js 18
              ├─ Fastify (adapter required)
              └─ [Supabase PostgreSQL]
```

**Option B: Railway / Render (Container)**
```
[Client] → [Load Balancer]
           └─ [Docker Container(s)]
              ├─ Node.js 18
              ├─ Fastify
              └─ [Supabase PostgreSQL]
```

**Option C: Supabase Edge Functions**
```
[Client] → [Supabase Edge Network]
           └─ [Deno Edge Functions]
              ├─ Adapted from Fastify
              └─ [Supabase PostgreSQL]
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Supabase production DB
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@...pooler.supabase.com:5432/postgres"

# Strong secrets
JWT_SECRET=<256-bit random string>

# Specific origins
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# XRPL mainnet
XRPL_NETWORK=mainnet
XRPL_SERVER=wss://xrplcluster.com
XRPL_ISSUER_ADDRESS=<mainnet address>
XRPL_ISSUER_SECRET=<encrypted or vault-stored>
```

---

## 15. Security Hardening

### Production Checklist

- [ ] Use HTTPS only (TLS 1.2+)
- [ ] Set secure JWT secret (256-bit minimum)
- [ ] Enable Helmet security headers
- [ ] Configure specific CORS origins (not `*`)
- [ ] Enable rate limiting (stricter than dev)
- [ ] Hash passwords with bcrypt (cost factor 10+)
- [ ] Validate all inputs (Zod schemas)
- [ ] Sanitize user-generated content
- [ ] Use parameterized queries (Prisma does this)
- [ ] Log security events (failed logins, etc.)
- [ ] Enable database backups (Supabase auto)
- [ ] Implement monitoring (Sentry, Datadog)
- [ ] Regular dependency updates (`npm audit`)

---

## 16. Scaling Considerations

### Horizontal Scaling

Fastify is stateless by design, making horizontal scaling straightforward:

```
                [Load Balancer]
                      │
       ┌──────────────┼──────────────┐
       │              │              │
  [Instance 1]   [Instance 2]   [Instance 3]
       │              │              │
       └──────────────┼──────────────┘
                      │
              [Supabase PostgreSQL]
```

**Key Points:**
- No session state (JWT is stateless)
- Database handles concurrency (transactions)
- Connection pooler distributes load

### Vertical Scaling

If single instance performance is critical:

1. **Increase Node.js memory:**
   ```bash
   NODE_OPTIONS=--max-old-space-size=4096 node dist/index.js
   ```

2. **Enable clustering:**
   ```javascript
   import cluster from 'cluster';
   import os from 'os';

   if (cluster.isPrimary) {
     for (let i = 0; i < os.cpus().length; i++) {
       cluster.fork();
     }
   } else {
     start(); // Start Fastify instance
   }
   ```

---

## 17. Monitoring & Observability

### Metrics to Track

**Application Metrics:**
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections

**Database Metrics:**
- Query time (average, max)
- Connection pool utilization
- Slow queries (>1s)
- Deadlocks

**XRPL Metrics:**
- Transaction success rate
- Average confirmation time
- Failed transactions

**Business Metrics:**
- New user signups
- Active communities
- Posts per day
- Synthesis triggers

### Recommended Tools

- **Sentry** - Error tracking and monitoring
- **Datadog** - APM and infrastructure monitoring
- **Supabase Dashboard** - Database performance
- **Grafana + Prometheus** - Custom dashboards

---

## 18. Future Architecture Evolution

### Planned Enhancements

**Phase 1 (Current):**
- ✅ Basic API with authentication
- ✅ PostgreSQL persistence
- ✅ XRPL wallet verification
- ✅ Manual synthesis triggers

**Phase 2 (Q1 2026):**
- [ ] Claude API integration for AI synthesis
- [ ] Asynchronous token reward queue (BullMQ)
- [ ] Real-time updates (Socket.IO)
- [ ] Advanced search (ElasticSearch or Algolia)

**Phase 3 (Q2 2026):**
- [ ] GraphQL API layer (Apollo Server)
- [ ] Caching layer (Redis)
- [ ] Image/file uploads (S3 or IPFS)
- [ ] Email notifications (SendGrid)

**Phase 4 (Q3 2026):**
- [ ] Microservices extraction (synthesis service)
- [ ] Event-driven architecture (Kafka/RabbitMQ)
- [ ] Multi-region deployment
- [ ] Advanced analytics dashboard

---

## 19. Contributing to Architecture

### Architecture Decision Records (ADRs)

All significant architectural decisions should be documented as ADRs:

**Format:**
```markdown
# ADR-XXXX: Title

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue we're trying to solve?

## Decision
What did we decide?

## Consequences
What are the trade-offs?

## Alternatives Considered
What other options were evaluated?
```

**Example:**
- ADR-0401: No Ephemeral Databases (mandated PostgreSQL)
- ADR-0601: XRPL WebAuth Integration Pattern (in progress)

---

## 20. Architecture Principles

### Guiding Principles

1. **Simplicity Over Complexity**
   - Choose the simplest solution that works
   - Avoid premature optimization
   - Prefer boring technology

2. **Developer Experience**
   - Fast feedback loops (hot reload, fast tests)
   - Clear error messages
   - Self-documenting code

3. **Type Safety**
   - TypeScript everywhere
   - Prisma for database types
   - Zod for runtime validation

4. **Resilience**
   - Graceful degradation
   - Retry logic for transient failures
   - Circuit breakers for external services

5. **Observability**
   - Structured logging
   - Metrics for every endpoint
   - Distributed tracing (future)

---

**This architecture is designed to grow with the platform while maintaining simplicity and developer joy.** 🌱

For questions or proposed changes, open an issue or discussion in the GitHub repository.
