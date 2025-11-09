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
5. You'll see TWO connection strings - we need the **Session mode** one

**CRITICAL: Port Selection**
- **Port 5432** - Direct database connection (use for local development & migrations)
- **Port 6543** - Connection pooler (use for production/serverless)

6. Copy the **Session mode** connection string (port 5432):

```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-X-region.pooler.supabase.com:5432/postgres
```

7. **Replace `[YOUR-PASSWORD]`** with the database password you created in step 1.2

**Why Port 5432 for Migrations:**
- Prisma migration commands require a direct database connection
- Port 6543 (pooler) causes migrations to hang because they don't wait for connection pooling
- Use port 5432 for `db push`, `migrate dev`, and local development
- Switch to port 6543 for production deployments with high connection volume

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
# CRITICAL: Use quotes and port 5432 (direct connection) for local development
DATABASE_URL="postgresql://postgres.[project-ref]:your_actual_password@aws-X-region.pooler.supabase.com:5432/postgres"
```

**Important Configuration Notes:**
- ✅ **Always use quotes** around the DATABASE_URL to avoid parsing issues
- ✅ **Use port 5432** for local development and migrations
- ✅ Replace `your_actual_password` with your actual database password
- ✅ Keep the full `postgres.[project-ref]` format from Supabase

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

### 3.1 Sync Database Schema (Recommended for Initial Setup)

**For initial migration, use `db push` instead of `migrate dev`:**

```bash
npx prisma db push
```

**Why `db push` instead of `migrate dev`?**
- ✅ Works immediately with direct connection (port 5432)
- ✅ Bypasses migration locking issues
- ✅ Perfect for initial schema sync
- ✅ Generates Prisma Client automatically
- ❌ Doesn't create migration history files (acceptable for initial setup)

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-X-region.pooler.supabase.com:5432"

🚀  Your database is now in sync with your Prisma schema. Done in 2.21s

✔ Generated Prisma Client (v6.19.0) to ./node_modules/@prisma/client in 349ms
```

**If you see the command hang:**
- ⚠️ Check you're using **port 5432** (not 6543) in DATABASE_URL
- ⚠️ Verify your database password is correct
- ⚠️ Ensure quotes are around the DATABASE_URL in `.env`

### 3.2 Alternative: Create Migration Files (Optional)

If you need migration history for version control:

```bash
npx prisma migrate dev --name init_postgresql
```

**Note:** This may hang on port 6543. Always use port 5432 for migrations.

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
[HH:MM:SS.MMM] INFO (XXXXX): Connected to database
[HH:MM:SS.MMM] INFO (XXXXX): Server listening at http://0.0.0.0:3000
[HH:MM:SS.MMM] INFO (XXXXX): Brother Nature Platform running on http://0.0.0.0:3000
[HH:MM:SS.MMM] INFO (XXXXX): Environment: development
```

**The server will appear to "hang" - this is normal!**
- ✅ The server is running and listening for requests
- ✅ Logs will appear as requests are made
- ✅ Press `Ctrl+C` to stop the server when needed
- ✅ Changes to files will trigger automatic restart (nodemon)

**Test endpoints:**
```bash
# In a NEW terminal window (server must be running):

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

### Issue 1: Migration Command Hangs (MOST COMMON)

**Symptom:**
```bash
npx prisma db push
# or
npx prisma migrate dev

# Output shows connection attempt but never completes:
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-X-region.pooler.supabase.com:6543"
# ...then hangs indefinitely
```

**Root Cause:**
You're using **port 6543** (connection pooler) instead of **port 5432** (direct connection).

**Solutions:**

**1. Fix your DATABASE_URL in `.env`:**
```env
# WRONG - will hang:
DATABASE_URL="postgresql://postgres.[ref]:pass@host.supabase.com:6543/postgres"

# CORRECT - works immediately:
DATABASE_URL="postgresql://postgres.[ref]:pass@host.supabase.com:5432/postgres"
```

**2. Verify the port:**
```bash
# Check your current DATABASE_URL
grep DATABASE_URL .env

# Should show :5432, NOT :6543
```

**3. Test connection:**
```bash
# macOS/Linux - verify port 5432 is reachable
nc -vz aws-X-region.pooler.supabase.com 5432

# Should output: "Connection to ... port 5432 [tcp/*] succeeded!"
```

**Why This Happens:**
- Port 6543 is the Supabase connection pooler (pgbouncer)
- Prisma migrations don't work with connection poolers
- Port 5432 is the direct PostgreSQL connection
- Always use port 5432 for local development and migrations

**When to Use Each Port:**
- ✅ **Port 5432**: Local dev, migrations, Prisma Studio, `db push`, `migrate dev`
- ✅ **Port 6543**: Production deployments, serverless functions, high concurrency

### Issue 2: "Can't reach database server"

**Symptom:**
```
Error: Can't reach database server at `db.xxxxx.supabase.co:5432`
```

**Solutions:**
1. **Check internet connection** - Supabase is cloud-hosted
2. **Verify DATABASE_URL** - Ensure you replaced `[YOUR-PASSWORD]`
3. **Check Supabase status** - https://status.supabase.com
4. **Firewall/VPN** - Some networks block port 5432

### Issue 3: DATABASE_URL Not Quoted

**Symptom:**
Database URL appears truncated or malformed in terminal output, or connection fails with parsing errors.

**Solution:**
Always use quotes around DATABASE_URL in `.env`:

```env
# WRONG - no quotes:
DATABASE_URL=postgresql://postgres:pass@host.supabase.com:5432/postgres

# CORRECT - with quotes:
DATABASE_URL="postgresql://postgres:pass@host.supabase.com:5432/postgres"
```

### Issue 4: "Password authentication failed"

**Symptom:**
```
Error: password authentication failed for user "postgres"
```

**Solutions:**
1. **Verify quotes around DATABASE_URL** - See Issue 3 above
2. **Reset database password:**
   - Supabase Dashboard → Project Settings → Database
   - Click "Reset database password"
   - Update `.env` with new password (in quotes)
3. **Check for special characters** - Ensure password is URL-encoded if it contains special chars

### Issue 5: Migration Already Applied

**Symptom:**
```
Error: Migration `20251108_init_postgresql` has already been applied
```

**Solution:**
This is fine! It means your database is already up-to-date. Skip the migration step.

### Issue 6: "Table already exists"

**Symptom:**
```
Error: Table 'User' already exists
```

**Solutions:**

**Option A: Use db push (recommended)**
```bash
npx prisma db push
```
This syncs schema without migration files and works even if tables exist.

**Option B: Reset database (DEVELOPMENT ONLY)**
```bash
npx prisma migrate reset
```
⚠️ **WARNING:** This deletes all data!

**Option C: Mark migration as applied**
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
