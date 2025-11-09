# Brother Nature Documentation Index

This repository contains all technical documentation for the Brother Nature backend (EHDC Core / Pillar IV Implementation Lab).

---

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| **[README-dev.md](./README-dev.md)** | Local development setup | New developers, onboarding |
| **[README-arch.md](./README-arch.md)** | System architecture overview | Developers, architects |
| **[MIGRATION_GUIDE.md](../platforms/brother-nature/core/MIGRATION_GUIDE.md)** | PostgreSQL/Supabase migration | DevOps, database admins |
| **[DEBUGGING_VICTORY.md](../platforms/brother-nature/core/DEBUGGING_VICTORY.md)** | Complete debugging journey | All team members |
| **[VALIDATION_SUCCESS.md](../platforms/brother-nature/core/VALIDATION_SUCCESS.md)** | Wallet verification validation | Security team, QA |

---

## 1. Getting Started

### For New Developers

Start here to get the backend running locally:

**👉 [README-dev.md](./README-dev.md)**

This guide covers:
- Installing dependencies and prerequisites
- Configuring environment variables
- Setting up Supabase PostgreSQL connection
- Running migrations and seeding test data
- Testing API routes (health, communities, posts)
- Troubleshooting common issues

**Time to complete:** ~10 minutes (after Supabase project setup)

---

## 2. Understanding the Architecture

### System Design Overview

Read the architecture documentation to understand how the system works:

**👉 [README-arch.md](./README-arch.md)**

This document explains:
- Fastify + Prisma + Supabase stack
- Plugin architecture and middleware
- Database schema and relationships
- API route organization
- JWT authentication flow
- Connection pooling strategy (DATABASE_URL vs DIRECT_URL)

**Recommended for:** All developers before making significant changes

---

## 3. Infrastructure & Operations

### Database Migration

If you need to understand the PostgreSQL migration or troubleshoot database issues:

**👉 [MIGRATION_GUIDE.md](../platforms/brother-nature/core/MIGRATION_GUIDE.md)**

Key topics:
- Why we migrated from SQLite to PostgreSQL
- Supabase setup step-by-step
- Port 5432 (direct) vs 6543 (pooled) explained
- Troubleshooting migration hangs
- Using `npx prisma db push` vs `migrate dev`

---

## 4. Project History & Context

### Debugging Journey

To understand the evolution of the codebase and lessons learned:

**👉 [DEBUGGING_VICTORY.md](../platforms/brother-nature/core/DEBUGGING_VICTORY.md)**

Documents:
- Complete TypeScript error resolution journey
- XRPL integration challenges and solutions
- Nonce validation fix (hex vs CUID)
- xrpl@3.1.0 type definition workarounds
- SQLite to PostgreSQL native array migration

**Value:** Permanent knowledge asset for future development

### Security Validation

To understand the wallet verification security model:

**👉 [VALIDATION_SUCCESS.md](../platforms/brother-nature/core/VALIDATION_SUCCESS.md)**

Covers:
- End-to-end wallet verification flow validation
- Cryptographic signature-based authentication
- Challenge-response pattern implementation
- Why "Challenge not found" proved success
- Ready for ADR-0601 formalization

---

## 5. API Documentation

### Available Endpoints

The Brother Nature API exposes the following routes:

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/health` | GET | Health check / uptime | No |
| `/api/auth/signup` | POST | Create new user account | No |
| `/api/auth/login` | POST | Login and get JWT token | No |
| `/api/auth/wallet/challenge` | POST | Generate XRPL wallet challenge | Yes |
| `/api/auth/wallet/verify` | POST | Verify XRPL wallet signature | Yes |
| `/api/communities` | GET | List all active communities | No |
| `/api/communities` | POST | Create new community | Yes (STEWARD) |
| `/api/communities/:slug` | GET | Get community by slug | No |
| `/api/posts` | GET | List all posts (paginated) | No |
| `/api/posts` | POST | Create new post | Yes |
| `/api/posts/community/:communityId` | GET | Get posts for community | No |
| `/api/posts/:postId` | GET | Get single post with replies | No |
| `/api/posts/:postId` | PUT | Update post | Yes (author only) |
| `/api/posts/:postId` | DELETE | Delete post | Yes (author only) |
| `/api/synthesis/trigger` | POST | Trigger synthesis for thread | Yes (STEWARD) |
| `/api/synthesis/thread/:threadRootId` | GET | Get synthesis artifacts | No |
| `/api/synthesis/:artifactId` | GET | Get single synthesis artifact | No |

**Authentication:** All authenticated routes require `Authorization: Bearer <JWT_TOKEN>` header

**Rate Limiting:** 100 requests per 15 minutes per IP

---

## 6. Development Workflow

### Branch Strategy

All development follows this flow:

```
main (production-ready)
  └── feature/your-feature-name
  └── fix/your-bugfix-name
  └── docs/your-documentation-update
```

**Steps:**
1. Create feature branch: `git checkout -b feature/local-dev-bootstrap`
2. Make changes and test locally
3. Commit with clear messages
4. Push to GitHub
5. Create Pull Request to `main`
6. Request review
7. Merge after approval

### Commit Message Format

```
<type>: <description>

<optional body>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code restructure (no functionality change)
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

**Examples:**
```
feat: Add GET /api/posts route for testing

fix: Correct PostgreSQL migration guide for real-world Supabase setup

docs: Add local development setup guide
```

---

## 7. Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/routes/auth.test.ts

# Watch mode
npm test -- --watch
```

### Manual API Testing

Use curl for quick endpoint testing:

```bash
# Health check
curl http://localhost:3000/health

# Login and save token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@brothernature.org","password":"admin123"}' \
  | jq -r '.token')

# Use token for authenticated requests
curl http://localhost:3000/api/communities \
  -H "Authorization: Bearer $TOKEN"
```

Or use tools like:
- **Postman** - GUI for API testing
- **Insomnia** - Alternative to Postman
- **HTTPie** - User-friendly curl alternative

---

## 8. Core Principles

### Development Philosophy

**1. Reproducibility**
Every developer should be able to clone, seed, and run the platform in under 10 minutes.

**2. Clarity**
All routes, configs, and environment variables must be self-documented with inline comments.

**3. Safety**
- Never commit secrets or real passwords
- Always use placeholders in `.env.example`
- Use `.gitignore` for sensitive files

**4. Documentation as Anti-Entropy**
Document WHY decisions were made, not just WHAT changed. Failed approaches are valuable knowledge.

**5. UCF Alignment**
All code must align with Universal Conscious Evolution Framework principles:
- Decentralization (no single point of control)
- Transparency (open decision-making)
- Resilience (survive failures gracefully)
- Regeneration (create value, not just extract)

---

## 9. Technology Stack

### Backend

- **Runtime:** Node.js 18+
- **Framework:** Fastify 4.x (high-performance, low-overhead)
- **ORM:** Prisma 6.x (type-safe database client)
- **Database:** PostgreSQL via Supabase (managed, persistent)
- **Authentication:** @fastify/jwt (stateless JWT tokens)
- **Validation:** Zod (TypeScript-first schema validation)
- **Logging:** Pino (low-overhead JSON logging)

### Blockchain

- **Network:** XRPL (XRP Ledger)
- **Library:** xrpl@3.1.0 (with type definition workarounds)
- **Use Cases:** Wallet verification, token rewards (EXPLORER, REGEN, GUARDIAN)

### Infrastructure

- **Database:** Supabase (PostgreSQL + connection pooling)
- **Deployment:** (TBD - likely Vercel, Railway, or Supabase Edge Functions)
- **Monitoring:** (TBD - likely Sentry + custom metrics)

---

## 10. Contribution Workflow

### For Internal Team Members

1. **Pick a task** from GitHub Issues or project board
2. **Create branch** following naming convention
3. **Implement changes** with tests
4. **Update documentation** if needed
5. **Test locally** using `npm run dev` and `npm test`
6. **Commit** with clear message
7. **Push** and create Pull Request
8. **Request review** from at least one team member
9. **Address feedback** if needed
10. **Merge** after approval

### For External Contributors

See `CONTRIBUTING.md` (to be added) for contributor guidelines.

---

## 11. Support & Resources

### Internal Resources

- **Slack:** #brother-nature-dev channel
- **GitHub Issues:** https://github.com/dj-ccs/EHDC/issues
- **Project Board:** (link to project board)

### External Resources

- **Fastify Docs:** https://fastify.dev
- **Prisma Docs:** https://www.prisma.io/docs
- **Supabase Docs:** https://supabase.com/docs
- **XRPL Docs:** https://xrpl.org/docs.html
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## 12. Roadmap

| Milestone | Status | Target |
|-----------|--------|--------|
| **v0.1.0** - MVP with SQLite | ✅ Complete | 2025-11-07 |
| **v0.2.0** - PostgreSQL Migration | ✅ Complete | 2025-11-08 |
| **v0.3.0** - Wallet Verification | ✅ Complete | 2025-11-08 |
| **v0.4.0** - Local Dev Bootstrap | 🚧 In Progress | 2025-11-09 |
| **v0.5.0** - Synthesis AI Integration | 📋 Planned | TBD |
| **v0.6.0** - XRPL Token Rewards | 📋 Planned | TBD |
| **v1.0.0** - Production Deployment | 📋 Planned | TBD |

---

## 13. FAQ

### Why Fastify instead of Express?

Fastify offers:
- **2x-3x faster** than Express in benchmarks
- Built-in **schema validation** (reduces code)
- Native **TypeScript support**
- Plugin architecture for modularity
- Active development and modern features

### Why Supabase instead of self-hosted PostgreSQL?

Supabase provides:
- **Managed PostgreSQL** (no ops overhead)
- **Connection pooling** (pgbouncer) out of the box
- **Automatic backups** and point-in-time recovery
- **Free tier** sufficient for development
- **Easy scaling** to production

### Why XRPL instead of Ethereum?

XRPL advantages:
- **Low transaction fees** (~$0.0002 vs $1-$50 on Ethereum)
- **Fast finality** (3-5 seconds vs minutes)
- **Energy efficient** (not proof-of-work)
- **Native DEX** for token trading
- Aligned with regenerative finance principles

### Can I run this without Supabase?

Yes! You can use local PostgreSQL:

1. Install PostgreSQL locally
2. Update `.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/brother_nature"
   DIRECT_URL="postgresql://username:password@localhost:5432/brother_nature"
   ```
3. Run migrations: `npx prisma db push`

---

## 14. Next Steps

### After Setup

Once you have the local environment running:

1. ✅ Read [README-arch.md](./README-arch.md) to understand the system
2. ✅ Browse the code in `src/routes/` to see endpoint implementations
3. ✅ Test all endpoints with the test credentials
4. ✅ Try creating a new post or community
5. ✅ Explore the Prisma schema in `prisma/schema.prisma`
6. ✅ Pick a task from GitHub Issues and start contributing!

---

**Welcome to Brother Nature! Let's build a regenerative future together.** 🌱
