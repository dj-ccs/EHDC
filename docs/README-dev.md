# Brother Nature Local Development Setup

This guide describes how to set up and test the Brother Nature backend (`EHDC/platforms/brother-nature/core`) for local development with Supabase and Prisma.

---

## 1. Prerequisites

Ensure these are installed:

```bash
node -v   # v18.x or later
npm -v    # v9.x or later
git --version
```

Confirm your PostgreSQL connection to Supabase works:

```bash
# macOS/Linux - verify port 5432 is reachable
nc -vz aws-1-ap-southeast-2.pooler.supabase.com 5432
```

If you see `Connection to ... port 5432 ... succeeded!`, connectivity is fine.

---

## 2. Clone the repository

```bash
git clone https://github.com/dj-ccs/EHDC.git
cd EHDC/platforms/brother-nature/core
```

---

## 3. Environment configuration

Copy the example file and edit your credentials:

```bash
cp .env.example .env
nano .env
```

Update both DATABASE_URL and DIRECT_URL with your Supabase credentials (quotes required):

```env
# Connect to Supabase via connection pooling (runtime)
DATABASE_URL="postgresql://postgres.tygshgeywmkuruljnfif:[YOUR-PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection for migrations (required for npx prisma db push)
DIRECT_URL="postgresql://postgres.tygshgeywmkuruljnfif:[YOUR-PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
```

> **Important:**
> - Replace `[YOUR-PASSWORD]` with your actual Supabase database password
> - Always use quotes around both URLs
> - Prisma will automatically use DIRECT_URL for migrations and DATABASE_URL for runtime queries

### Get your Supabase connection strings:

1. Go to your Supabase dashboard
2. Click **Project Settings** (gear icon) → **Database**
3. Scroll to **Connection string** section
4. Copy the **Transaction mode** string (port 6543 with `?pgbouncer=true`) for DATABASE_URL
5. Copy the **Session mode** string (port 5432) for DIRECT_URL
6. Replace `[YOUR-PASSWORD]` with your database password in both

---

## 4. Install dependencies

```bash
npm install
```

---

## 5. Push Prisma schema and seed test data

Sync your database schema with Prisma:

```bash
npx prisma db push
```

Expected output:

```
🚀  Your database is now in sync with your Prisma schema. Done in 2.21s
✔ Generated Prisma Client (v6.19.0) to ./node_modules/@prisma/client in 349ms
```

Populate database with test data:

```bash
npx prisma db seed
```

Expected output:

```
🌱 Seeding database...
Creating users...
✅ Created users: admin, steward1, regenerative_farmer
Creating communities...
✅ Created communities: Deniliquin Soil Health, Riverina Water Management, Canterbury Regenerative Practices
✅ Created posts and replies
✅ Created synthesis artifact

🎉 Database seeding complete!

Test accounts:
  Admin:   admin@brothernature.org / admin123
  Steward: steward@brothernature.org / steward123
  User:    farmer@example.com / user123
```

---

## 6. Start the local server

```bash
npm run dev
```

You should see logs like:

```
[HH:MM:SS.MMM] INFO (XXXXX): Connected to database
[HH:MM:SS.MMM] INFO (XXXXX): Server listening at http://0.0.0.0:3000
[HH:MM:SS.MMM] INFO (XXXXX): Brother Nature Platform running on http://0.0.0.0:3000
[HH:MM:SS.MMM] INFO (XXXXX): Environment: development
```

**The server will appear to "hang" - this is normal!**
- The server is running and listening for requests
- Logs will appear as requests are made
- Press `Ctrl+C` to stop the server when needed
- Changes to files will trigger automatic restart (nodemon)

---

## 7. Test API routes

**Open a NEW terminal window** (keep the server running in the first one) and test the endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Get communities
curl http://localhost:3000/api/communities

# Get all posts
curl http://localhost:3000/api/posts
```

Expected responses:

### Health Check

```json
{
  "status": "ok",
  "timestamp": "2025-11-09T03:55:21.650Z",
  "uptime": 42.123
}
```

### Communities

```json
{
  "communities": [
    {
      "id": "...",
      "country": "aus",
      "region": "deniliquin",
      "category": "soil-health",
      "name": "Deniliquin Soil Health",
      "description": "Discussion forum for regenerative soil practices in the Deniliquin region",
      "slug": "aus-deniliquin-soil-health",
      "isActive": true,
      "_count": {
        "members": 2,
        "posts": 3
      }
    },
    {
      "id": "...",
      "country": "aus",
      "region": "riverina",
      "category": "water-management",
      "name": "Riverina Water Management",
      "description": "Water conservation and management strategies for the Riverina",
      "slug": "aus-riverina-water-management",
      "isActive": true,
      "_count": {
        "members": 2,
        "posts": 1
      }
    }
  ]
}
```

### Posts

```json
{
  "posts": [
    {
      "id": "...",
      "title": "Introduction to Regenerative Soil Practices",
      "content": "# Welcome to Deniliquin Soil Health\n\nI'm excited to share...",
      "author": {
        "id": "...",
        "username": "regenerative_farmer",
        "displayName": "Sarah Chen"
      },
      "community": {
        "id": "...",
        "name": "Deniliquin Soil Health",
        "slug": "aus-deniliquin-soil-health"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "pages": 1
  }
}
```

---

## 8. Troubleshooting

### Prisma connection error (P1001)

**Symptom:**
```
Error: Can't reach database server at `aws-X-region.pooler.supabase.com:5432`
```

**Solutions:**
1. **Check internet connection** - Supabase is cloud-hosted
2. **Verify passwords** - Ensure `[YOUR-PASSWORD]` is replaced in both URLs
3. **Check quotes** - Both DATABASE_URL and DIRECT_URL must be in quotes
4. **Verify Supabase status** - https://status.supabase.com

### Migration command hangs

**Symptom:**
```bash
npx prisma db push
# ...hangs indefinitely
```

**Solution:**
Make sure your `.env` has **DIRECT_URL** configured. Prisma requires the direct connection (port 5432) for migrations. The pooled connection (port 6543) will hang.

### No data returned

**Symptom:**
Endpoints return empty arrays or no data.

**Solution:**
Make sure you ran both:
```bash
npx prisma db push   # Creates tables
npx prisma db seed   # Loads test data
```

### 404 on routes

**Symptom:**
```
{"statusCode":404,"error":"Not Found","message":"Route GET:/api/posts not found"}
```

**Solution:**
1. Ensure server is running (`npm run dev`)
2. Check route prefix - routes are under `/api/` except `/health`
3. Restart the server if you just made code changes

---

## 9. Using Prisma Studio

View and edit database data via Prisma's GUI:

```bash
npx prisma studio
```

Opens at: `http://localhost:5555`

You can:
- Browse all tables
- Edit records
- Run queries
- Inspect relationships

---

## 10. Running tests

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm test -- --coverage
```

---

## 11. Next Steps

Once confirmed working:

1. ✅ Test authentication routes (`/api/auth/signup`, `/api/auth/login`)
2. ✅ Create a community via `/api/communities` (requires STEWARD role)
3. ✅ Create posts via `/api/posts` (requires authentication)
4. ✅ Test the synthesis route `/api/synthesis/trigger` (requires STEWARD role)
5. ✅ Explore XRPL wallet verification at `/api/auth/wallet/challenge`

All routes are documented in the codebase under `src/routes/`.

---

## 12. Development Workflow

### Making Changes

1. Edit code in `src/` directory
2. Server auto-restarts (nodemon)
3. Test your changes via curl or Postman
4. Commit when working

### Schema Changes

If you modify `prisma/schema.prisma`:

```bash
# Sync schema to database
npx prisma db push

# Regenerate Prisma Client
npx prisma generate

# Optional: Create migration for version control
npx prisma migrate dev --name describe_your_change
```

### Database Reset

To clear all data and start fresh:

```bash
npx prisma migrate reset   # Clears DB and re-runs seed
```

⚠️ **WARNING:** This deletes all data!

---

## 13. Common Development Tasks

### Add a new route

1. Create file in `src/routes/yourroute.ts`
2. Export default Fastify plugin function
3. Register in `src/index.ts`:
   ```typescript
   import yourRoute from './routes/yourroute';
   await fastify.register(yourRoute, { prefix: '/api/yourroute' });
   ```

### Add a new database model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Update `prisma/seed.ts` with test data
4. Run `npx prisma db seed`

### Debug database queries

Enable query logging in `.env`:

```env
# Prisma will log all SQL queries
DATABASE_URL="postgresql://...?schema=public&connection_limit=5&pool_timeout=10&logging=query"
```

Or in `src/index.ts`:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],  // Full logging
});
```

---

## 14. Production Deployment Notes

When deploying to production:

1. **Environment Variables:**
   - Use production DATABASE_URL (port 6543 with pooling)
   - Set NODE_ENV=production
   - Use strong JWT_SECRET
   - Configure CORS_ORIGIN to specific domains

2. **Database:**
   - Use `npx prisma migrate deploy` (not `db push`)
   - Enable connection pooling for serverless
   - Set up backups via Supabase

3. **Security:**
   - Enable rate limiting
   - Configure CSP headers
   - Use HTTPS only
   - Implement proper logging

---

**You're all set!** The Brother Nature API is now running locally. Happy coding! 🌱
