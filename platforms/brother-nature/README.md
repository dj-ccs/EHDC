# Brother Nature Platform

A decentralized knowledge sharing and community platform for the EHDC ecosystem.

## MVP Status

**Current Version**: 0.1.0 (MVP Implementation Complete)

### ✅ Implemented Features

- **User Authentication**: Registration, login with JWT
- **Geographic Communities**: Country/region/category hierarchy
- **Threaded Discussions**: Posts with unlimited nesting depth
- **Synthesis System**: Steward-triggered AI synthesis (manual MVP implementation)
- **Role-Based Access**: USER, STEWARD, ADMIN roles
- **XRPL Integration**: Database schema ready for XRP Ledger wallet addresses
- **RESTful API**: Complete CRUD operations for all core entities
- **Docker Support**: One-command development environment

### 🚧 In Progress / Planned

- **Frontend**: React + Next.js web interface (Phase 2)
- **AI Integration**: Claude API for automated synthesis (Phase 2)
- **Token Rewards**: XRPL-based EXPLORER/REGEN/GUARDIAN tokens (Phase 2)
- **Real-time Updates**: Socket.io for live discussions (Phase 2)
- **IPFS Storage**: Decentralized content storage (Phase 3)
- **Mobile App**: iOS/Android applications (Phase 3)

## Overview

Brother Nature serves as the digital town square for regenerative agriculture communities, enabling knowledge sharing, peer verification, and token rewards for ecosystem stewardship activities.

## Features

- 🌍 **Geographic Communities**: Country and region-based forums (e.g., `/aus/deniliquin`)
- 💬 **Knowledge Sharing**: Threaded discussions with multimedia support
- ✅ **Peer Verification**: Multi-signature content verification system
- 🪙 **Token Integration**: Automatic EXPLORER token rewards for contributions
- 📊 **ESV Data Integration**: Link discussions to real ecosystem measurements
- 🔐 **Data Sovereignty**: Solid Pod integration for user data control
- 🌐 **Progressive Decentralization**: Built for future migration to fully distributed infrastructure

## Technical Stack

- **Backend**: Node.js 18+ + TypeScript + Fastify
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Blockchain**: XRP Ledger (XRPL) with native RLUSD stablecoin support
- **AI**: Claude API integration for synthesis (planned)
- **Real-time**: Socket.io (planned for Phase 2)
- **Frontend**: React + Next.js (planned for Phase 2)

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/dj-ccs/EHDC.git
cd EHDC/platforms/brother-nature/core

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration (DATABASE_URL, JWT_SECRET, etc.)

# 4. Start PostgreSQL and Redis (if not using Docker)
# Option A: Use Docker Compose for just the databases
docker-compose up postgres redis -d

# Option B: Install and start PostgreSQL and Redis locally
# (See Prerequisites section below)

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Generate Prisma Client
npx prisma generate

# 7. (Optional) Seed database with test data
npm run seed

# 8. Start development server
npm run dev

# Server will start at http://localhost:3000
# Health check: http://localhost:3000/health
```

### Docker Deployment (Full Stack)

```bash
# Build and run everything with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

## URL Structure

The platform supports geographic organization:

```
/BrotherNature/[country]/[region]/[category]

Examples:
- /BrotherNature/aus/deniliquin/soil-health
- /BrotherNature/aus/riverina/water-management
- /BrotherNature/nz/canterbury/regenerative-practices
```

## Configuration

### Environment Variables

See `.env.example` for the complete list. Key variables:

```env
# Application
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-change-in-production

# Database
DATABASE_URL=postgresql://brother_nature:password@localhost:5432/brother_nature_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# XRP Ledger (XRPL)
XRPL_NETWORK=testnet
XRPL_SERVER=wss://s.altnet.rippletest.net:51233
XRPL_ISSUER_ADDRESS=your-xrpl-address
XRPL_ISSUER_SECRET=your-xrpl-secret

# Token Configuration
EXPLORER_TOKEN_CURRENCY=EXP
REGEN_TOKEN_CURRENCY=RGN
GUARDIAN_TOKEN_CURRENCY=GRD

# AI Synthesis (for future integration)
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_MODEL=claude-3.5-sonnet
```

**Important**: Replace all placeholder values with actual credentials before deploying to production.

## API Documentation

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user
  - Body: `{ email, username, password, displayName? }`
- `POST /api/auth/login` - Login user
  - Body: `{ email, password }`
  - Returns: `{ user, token }`
- `GET /api/auth/me` - Get current user profile (requires auth)

### Communities (`/api/communities`)

- `POST /api/communities` - Create community (requires STEWARD role)
  - Body: `{ country, region?, category?, name, description? }`
- `GET /api/communities` - List all communities
- `GET /api/communities/:slug` - Get community by slug
- `POST /api/communities/:communityId/join` - Join community (requires auth)

### Posts (`/api/posts`)

- `POST /api/posts` - Create post or reply (requires auth)
  - Body: `{ title?, content, communityId, parentPostId?, contentType? }`
- `GET /api/posts/community/:communityId` - Get posts for community
  - Query: `?page=1&limit=20`
- `GET /api/posts/:postId` - Get post with full thread
- `PUT /api/posts/:postId` - Update post (requires auth, must be author)
  - Body: `{ title?, content? }`
- `DELETE /api/posts/:postId` - Delete post (requires auth, must be author)

### Synthesis (`/api/synthesis`)

- `POST /api/synthesis/trigger` - Trigger synthesis for thread (requires STEWARD role)
  - Body: `{ threadRootId, synthesisType? }`
- `GET /api/synthesis/thread/:threadRootId` - Get synthesis artifacts for thread
- `GET /api/synthesis/:artifactId` - Get specific synthesis artifact
- `GET /api/synthesis` - List recent synthesis artifacts
  - Query: `?page=1&limit=20`

### Health Check

- `GET /health` - Server health status

## Deployment to carboncaptureshield.com

### Nginx Configuration

```nginx
location /BrotherNature/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### SSL/TLS

Ensure your carboncaptureshield.com certificate covers the subdirectory deployment.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Roadmap

- [ ] Phase 1: Basic forum functionality (Q2 2025)
- [ ] Phase 2: Token integration & rewards (Q3 2025)
- [ ] Phase 3: Mobile app (Q4 2025)
- [ ] Phase 4: Full decentralization (Q1 2026)

## License

This project is part of the EHDC framework and is released under CC0 1.0 Universal (Public Domain).

## Support

- Documentation: [EHDC Wiki](https://github.com/dj-ccs/EHDC/wiki)
- Issues: [GitHub Issues](https://github.com/dj-ccs/EHDC/issues)
- Email: djnicke@carboncaptureshield.com
