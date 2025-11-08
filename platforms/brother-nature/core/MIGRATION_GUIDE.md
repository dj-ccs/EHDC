# 🚀 PostgreSQL Migration Guide - Supabase Setup

## Overview

This guide documents the migration from **ephemeral SQLite** to **persistent PostgreSQL** hosted on **Supabase**, in compliance with **ADR-0401** (UCF Constitutional Mandate: No Ephemeral Databases).

---

## Migration Context

### Why This Migration is Critical

**Previous State:** SQLite (`dev.db`)
- ❌ Ephemeral storage (clears on server restart)
- ❌ Blocks security testing (challenges lost on restart)
- ❌ Not production-ready
- ❌ Violates ADR-0401

**New State:** PostgreSQL (Supabase)
- ✅ Persistent storage (survives restarts)
- ✅ Production-grade database
- ✅ Enables full security testing
- ✅ Compliant with ADR-0401

### Schema Changes

**Key Improvement: Native Array Support**

The `SynthesisArtifact.keyPoints` field now uses PostgreSQL's native array type:

```prisma
// Before (SQLite):
keyPoints String @map("key_points")  // Required JSON serialization

// After (PostgreSQL):
keyPoints String[] @map("key_points")  // Native array type
```

**Code Simplification:**
- ❌ Removed: `JSON.stringify(keyPoints)` on write
- ❌ Removed: `JSON.parse(keyPoints)` on read
- ✅ Direct array usage throughout codebase

---

## Step-by-Step Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn installed
- Brother Nature repository cloned
- Basic familiarity with command line

---

## Part 1: Create Supabase Project

### 1.1 Sign Up / Log In

1. Navigate to **https://supabase.com**
2. Click **"Start your project"**
3. Sign in with GitHub (recommended) or email

### 1.2 Create New Project

1. Click **"New Project"**
2. Fill in project details:
   - **Name:** `brother-nature-dev` (or your preferred name)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your location
   - **Pricing Plan:** Free tier (sufficient for development)
3. Click **"Create new project"**
4. **Wait 2-3 minutes** for provisioning to complete

### 1.3 Get Connection String

1. In your Supabase dashboard, click **"Project Settings"** (gear icon)
2. Navigate to **"Database"** in left sidebar
3. Scroll to **"Connection string"** section
4. Select **"URI"** mode (not "Transaction mode")
5. Copy the connection string:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

6. **Replace `[YOUR-PASSWORD]`** with the database password you created in step 1.2

---

## Part 2: Configure Brother Nature

### 2.1 Set Environment Variable

Navigate to the Brother Nature core directory:

```bash
cd platforms/brother-nature/core
```

Create `.env` file from example:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```env
# Replace the entire DATABASE_URL line with your Supabase connection string
DATABASE_URL=postgresql://postgres:your_actual_password@db.abcdefghijklm.supabase.co:5432/postgres
```

**Important Security Notes:**
- ✅ `.env` is in `.gitignore` (never commit this file)
- ✅ Use environment variables in production (GitHub Secrets, Vercel, etc.)
- ❌ Never commit database passwords to version control

### 2.2 Install Dependencies

Ensure Prisma CLI is available:

```bash
npm install
```

Or if using yarn:

```bash
yarn install
```

---

## Part 3: Run Database Migration

### 3.1 Generate Prisma Client

```bash
npx prisma generate
```

This regenerates the Prisma client with PostgreSQL-specific types.

### 3.2 Create Initial Migration

```bash
npx prisma migrate dev --name init_postgresql
```

**What this does:**
1. Connects to your Supabase PostgreSQL database
2. Creates all tables defined in `schema.prisma`
3. Creates a migration file in `prisma/migrations/`
4. Updates `migration_lock.toml` to `provider = "postgresql"`

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.xxxxx.supabase.co:5432"

Applying migration `20251108_init_postgresql`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251108_init_postgresql/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in XXXms
```

### 3.3 Seed the Database (Optional)

Populate your database with test data:

```bash
npx prisma db seed
```

**This creates:**
- 3 test users (admin, steward, user)
- 3 communities (Deniliquin, Riverina, Canterbury)
- Sample posts and threads
- Example synthesis artifact

**Test credentials:**
```
Admin:   admin@brothernature.org / admin123
Steward: steward@brothernature.org / steward123
User:    farmer@example.com / user123
```

---

## Part 4: Verify Migration Success

### 4.1 Check Supabase Table Editor

1. Return to Supabase dashboard
2. Click **"Table Editor"** in left sidebar
3. You should see all tables:
   - `User`
   - `Community`
   - `CommunityMember`
   - `Post`
   - `SynthesisArtifact`
   - `TokenReward`
   - `WalletChallenge`
   - `_prisma_migrations`

4. Click on `SynthesisArtifact` table
5. Verify the `key_points` column type is **`text[]`** (PostgreSQL array)

### 4.2 Test Database Connection

```bash
npx prisma studio
```

This opens Prisma Studio (GUI database viewer) at `http://localhost:5555`

**Verify:**
- All tables are visible
- Data loaded correctly (if you ran seed)
- `keyPoints` field in `SynthesisArtifact` shows as array

### 4.3 Start the Server

```bash
npm run dev
```

**Expected output:**
```
Server running on http://0.0.0.0:3000
Connected to PostgreSQL database
```

**Test endpoints:**
```bash
# Health check
curl http://localhost:3000/api/health

# Get communities (requires auth)
curl http://localhost:3000/api/communities
```

---

## Part 5: Test Wallet Verification Flow

### 5.1 Generate Challenge

```bash
curl -X POST http://localhost:3000/api/auth/wallet/challenge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "xrplWalletAddress": "rYourXRPLAddressHere"
  }'
```

**Expected response:**
```json
{
  "challenge": {
    "nonce": "64-character-hex-string",
    "message": "Verify wallet ownership for Brother Nature...",
    "expiresAt": "2025-11-08T09:00:00.000Z"
  }
}
```

### 5.2 Verify the Challenge Persists

**Stop the server** (Ctrl+C), then **restart it**:

```bash
npm run dev
```

**Query the database:**

```bash
npx prisma studio
```

Navigate to `WalletChallenge` table - **your challenge should still be there!**

**This proves:**
- ✅ Database is persistent (not ephemeral)
- ✅ SQLite migration successful
- ✅ Production-ready infrastructure

---

## Common Issues & Solutions

### Issue 1: "Can't reach database server"

**Symptom:**
```
Error: Can't reach database server at `db.xxxxx.supabase.co:5432`
```

**Solutions:**
1. **Check internet connection** - Supabase is cloud-hosted
2. **Verify DATABASE_URL** - Ensure you replaced `[YOUR-PASSWORD]`
3. **Check Supabase status** - https://status.supabase.com
4. **Firewall/VPN** - Some networks block port 5432

### Issue 2: "Password authentication failed"

**Symptom:**
```
Error: password authentication failed for user "postgres"
```

**Solutions:**
1. **Reset database password:**
   - Supabase Dashboard → Project Settings → Database
   - Click "Reset database password"
   - Update `.env` with new password
2. **Check for special characters** - Ensure password is URL-encoded if it contains special chars

### Issue 3: Migration Already Applied

**Symptom:**
```
Error: Migration `20251108_init_postgresql` has already been applied
```

**Solution:**
This is fine! It means your database is already up-to-date. Skip the migration step.

### Issue 4: "Table already exists"

**Symptom:**
```
Error: Table 'User' already exists
```

**Solutions:**

**Option A: Reset database (DEVELOPMENT ONLY)**
```bash
npx prisma migrate reset
```
⚠️ **WARNING:** This deletes all data!

**Option B: Mark migration as applied**
```bash
npx prisma migrate resolve --applied "20251108_init_postgresql"
```

---

## Migration Rollback (If Needed)

If you need to rollback to SQLite (not recommended):

1. Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

2. Change `keyPoints` back to `String`:
```prisma
keyPoints String @map("key_points")
```

3. Restore JSON serialization in:
   - `src/routes/synthesis.ts`
   - `prisma/seed.ts`

4. Delete migrations and reset:
```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init_sqlite
```

---

## Next Steps After Migration

### 1. Update XRPL Configuration

Ensure `.env` has testnet credentials:

```bash
# Get testnet wallet at https://xrpl.org/xrp-testnet-faucet.html
XRPL_ISSUER_ADDRESS=rYourTestnetAddressHere
XRPL_ISSUER_SECRET=sYourTestnetSecretHere
```

### 2. Test Token Rewards

Trigger a synthesis to test XRPL integration:

```bash
curl -X POST http://localhost:3000/api/synthesis/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STEWARD_JWT_TOKEN" \
  -d '{
    "threadRootId": "your-post-id",
    "synthesisType": "thread"
  }'
```

### 3. Complete Security Testing

With persistent database, you can now test:
- [ ] Full challenge-verify flow (without server restarts)
- [ ] Challenge expiration (5-minute window)
- [ ] Nonce reuse prevention
- [ ] Signature validation edge cases
- [ ] Hardware wallet compatibility

### 4. Production Deployment

For production, use Supabase production tier:
- **Connection pooling** (recommended for serverless)
- **Read replicas** (for scaling)
- **Point-in-time recovery** (backups)
- **Row-level security** (additional security layer)

---

## Reference Documentation

### Database Schema Overview

```
User
├── id (CUID)
├── email (unique)
├── username (unique)
├── xrplWalletAddress (unique, optional)
├── role (USER | STEWARD | ADMIN)
└── Relations: posts, communities, synthesisCreated, tokenRewards, walletChallenges

Community
├── id (CUID)
├── country, region, category
├── slug (unique)
└── Relations: posts, members

Post (Threaded)
├── id (CUID)
├── title, content
├── parentPostId (for threading)
├── threadDepth
└── Relations: author, community, replies, synthesisArtifacts

SynthesisArtifact
├── id (CUID)
├── title, summary
├── keyPoints (String[] - PostgreSQL array) ← MIGRATION CHANGE
├── threadRootId
└── Relations: threadRoot, createdBy

TokenReward
├── id (CUID)
├── tokenType (EXPLORER | REGEN | GUARDIAN)
├── amount, xrplTxHash
├── status (PENDING | PROCESSING | CONFIRMED | FAILED)
└── Relations: user

WalletChallenge
├── id (CUID)
├── nonce (64-char hex string)
├── message, xrplAddress
├── isUsed, isVerified
├── expiresAt (5-minute window)
└── Relations: user
```

### Key Environment Variables

```env
# Database (required)
DATABASE_URL=postgresql://...

# JWT (required)
JWT_SECRET=your-secret-key

# XRPL (required for token rewards)
XRPL_NETWORK=testnet
XRPL_SERVER=wss://s.altnet.rippletest.net:51233
XRPL_ISSUER_ADDRESS=rYourAddress
XRPL_ISSUER_SECRET=sYourSecret
```

---

## Support & Resources

### Supabase Resources
- **Dashboard:** https://supabase.com/dashboard
- **Documentation:** https://supabase.com/docs
- **Status Page:** https://status.supabase.com
- **Community:** https://github.com/supabase/supabase/discussions

### Prisma Resources
- **Documentation:** https://www.prisma.io/docs
- **Migration Guide:** https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Schema Reference:** https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

### EHDC/Brother Nature Resources
- **DEBUGGING_VICTORY.md** - Complete debugging journey
- **VALIDATION_SUCCESS.md** - Wallet verification validation
- **DEPENDENCY_RESET.md** - xrpl@3.1.0 workarounds
- **TECHNICAL_ROADMAP.md** - Phase 2 priorities

---

## Migration Checklist

Use this checklist to ensure successful migration:

- [ ] Created Supabase project
- [ ] Copied connection string with correct password
- [ ] Updated `.env` file with `DATABASE_URL`
- [ ] Ran `npx prisma generate`
- [ ] Ran `npx prisma migrate dev --name init_postgresql`
- [ ] Verified tables in Supabase Table Editor
- [ ] Confirmed `key_points` column is `text[]` type
- [ ] Ran `npx prisma db seed` (optional)
- [ ] Tested server startup (`npm run dev`)
- [ ] Verified challenge persistence (create, restart, check)
- [ ] Updated XRPL testnet credentials
- [ ] Tested full wallet verification flow
- [ ] Documented connection string in team password manager
- [ ] Celebrated removing ephemeral SQLite! 🎉

---

## Conclusion

This migration represents a **critical infrastructure upgrade** that:

1. ✅ **Eliminates ephemeral storage** (ADR-0401 compliance)
2. ✅ **Enables full security testing** (persistent challenges)
3. ✅ **Simplifies codebase** (native array types)
4. ✅ **Establishes production foundation** (Supabase PostgreSQL)

**The Brother Nature API is now production-ready for Phase 2 development.**

---

*Migration guide created: November 8, 2025*
*Target database: Supabase PostgreSQL*
*Schema version: init_postgresql*
