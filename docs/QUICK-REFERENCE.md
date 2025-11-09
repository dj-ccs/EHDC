# Quick Testing Reference

## Health Check Endpoint

**IMPORTANT:** The health check endpoint is at `/health` (NOT `/api/health`)

```bash
# Correct:
curl http://localhost:3000/health

# Incorrect (returns 404):
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T15:34:24.865Z",
  "uptime": 42.123
}
```

---

## API Endpoints (all under `/api/` prefix)

### Communities

```bash
# List all communities
curl http://localhost:3000/api/communities
```

**Expected Response:**
```json
{
  "communities": [
    {
      "id": "...",
      "country": "aus",
      "region": "deniliquin",
      "category": "soil-health",
      "name": "Deniliquin Soil Health",
      "slug": "aus-deniliquin-soil-health",
      "_count": {
        "members": 2,
        "posts": 3
      }
    }
  ]
}
```

### Posts

```bash
# List all posts
curl http://localhost:3000/api/posts
```

**Expected Response:**
```json
{
  "posts": [
    {
      "id": "...",
      "title": "Introduction to Regenerative Soil Practices",
      "content": "...",
      "author": {
        "username": "regenerative_farmer",
        "displayName": "Sarah Chen"
      },
      "community": {
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

## If You See Empty Data

If `/api/communities` and `/api/posts` return empty arrays, you need to seed the database:

```bash
# Run seed script
npx prisma db seed
```

**Expected Output:**
```
🌱 Seeding database...
Creating users...
✅ Created users: admin, steward1, regenerative_farmer
Creating communities...
✅ Created communities: Deniliquin Soil Health, Riverina Water Management, Canterbury Regenerative Practices
Creating posts...
✅ Created posts and replies
✅ Created synthesis artifact

🎉 Database seeding complete!
```

---

## Common Testing Scenarios

### 1. Fresh Setup Test

After initial setup, test in this order:

```bash
# 1. Health check (no database required)
curl http://localhost:3000/health

# 2. Check if data exists
curl http://localhost:3000/api/communities
curl http://localhost:3000/api/posts

# 3. If empty, seed the database
npx prisma db seed

# 4. Verify seed worked
curl http://localhost:3000/api/communities  # Should return 3 communities
curl http://localhost:3000/api/posts         # Should return 4 posts
```

### 2. Authentication Test

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@brothernature.org","password":"admin123"}'

# Save the token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use token for authenticated requests
curl http://localhost:3000/api/communities \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create a Post (Requires Auth)

```bash
# First, login and get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@example.com","password":"user123"}' \
  | jq -r '.token')

# Then create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "Hello from the API!",
    "communityId": "YOUR_COMMUNITY_ID_HERE"
  }'
```

---

## Troubleshooting

### "Route GET:/health not found" or 404 on /api/health

**Problem:** You're using `/api/health` instead of `/health`

**Solution:** The health endpoint is at root level, not under `/api/`:
```bash
# Wrong:
curl http://localhost:3000/api/health

# Correct:
curl http://localhost:3000/health
```

### Empty Arrays from /api/communities and /api/posts

**Problem:** Database has no seed data

**Solution:** Run the seed script:
```bash
npx prisma db seed
```

### Seed Script Fails with TypeScript Errors

**Problem:** Old version of seed.ts with unused variables

**Solution:** Update to latest code from main branch:
```bash
git pull origin main
npx prisma db seed
```

### "Can't reach database server"

**Problem:** DATABASE_URL or DIRECT_URL is incorrect

**Solution:** Check your `.env` file:
1. Verify both URLs have correct password
2. Ensure URLs are in quotes
3. Check port 5432 for DIRECT_URL, port 6543 for DATABASE_URL

---

## Test Credentials

After running `npx prisma db seed`, these accounts are available:

| Role | Email | Password | Use Case |
|------|-------|----------|----------|
| Admin | `admin@brothernature.org` | `admin123` | Full platform access |
| Steward | `steward@brothernature.org` | `steward123` | Create communities, trigger synthesis |
| User | `farmer@example.com` | `user123` | Regular user, create posts |

---

## Quick Command Reference

```bash
# Start server
npm run dev

# View database in GUI
npx prisma studio

# Reset and reseed database
npx prisma migrate reset

# Check database schema
npx prisma db push --dry-run

# Generate Prisma client
npx prisma generate

# Run tests
npm test
```

---

**For detailed documentation, see:**
- [README-dev.md](./README-dev.md) - Complete setup guide
- [README-arch.md](./README-arch.md) - Architecture overview
- [README.md](./README.md) - Full documentation index
