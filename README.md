# EHDC: The Regenerative Economy Engine

[![License: CC0-1.0](https://img.shields.io/badge/License-CC0_1.0-lightgrey.svg)](http://creativecommons.org/publicdomain/zero/1.0/)
[![Status: MVP Development](https://img.shields.io/badge/status-mvp_development-green.svg)](https://github.com/dj-ccs/EHDC)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**🌱 Open-Source Framework for Valuing Ecosystem Health**
**🆓 Public Domain (CC0 1.0 Universal)**
**📄 USPTO Serial No: 18/098,564 (Abandoned)**
**🌍 WIPO Publication No: WO2024155705**

---

## Mission Statement

This repository contains the official implementation of the **Ecosystem Health-derived Digital Currency (EHDC)** system and the **Brother Nature** platform. It serves as the focused **"Implementation Laboratory"** for the broader vision outlined in the **Unified Conscious Evolution Framework (UCF)**.

While the [UCF Repository](https://github.com/dj-ccs/Unified-Conscious-Evolution-Framework) holds the comprehensive "North Star" vision, **this repository is where theory becomes working code**.

### An Implementation Lab of the Unified Conscious Evolution Framework (UCF)

**This repository is the active Implementation Laboratory for Pillar IV (Ecosystem Partnership) 
of the Unified Conscious Evolution Framework (UCF).**

**Our Mission**: To build the working code for a regenerative economy, including the Brother 
Nature social platform and the EHDC 3-token system (EXPLORER, REGEN, GUARDIAN).

**Our North Star**: The UCF Repository contains the full 12-token vision and philosophical 
architecture that guides our work here.

**Purpose**: Build, test, and validate the core components of the regenerative economy.

**Primary Deliverables**:
1. A functional implementation of the **Brother Nature** social platform
2. The on-chain implementation of the three core ecosystem tokens: **EXPLORER, REGEN, GUARDIAN**

Successful, validated patterns from EHDC will be documented and promoted as standards within the main UCF framework.

---

## Core Components

### 1. Brother Nature Platform

A federated social platform designed for deep conversation, knowledge synthesis, and community sovereignty.

**Key Features**:
- **Geographic Communities**: Country/region/category hierarchy for local knowledge sharing
- **Threaded Discussions**: Unlimited nesting depth for rich conversations
- **Synthesis System**: Steward-triggered AI analysis to extract actionable insights
- **Role-Based Access**: USER, STEWARD, ADMIN roles with appropriate permissions
- **Data Sovereignty**: Users own their contributions and earned tokens

### 2. EHDC 3-Token Economy

The on-chain implementation of the three core ecosystem tokens:

**🧬 EXPLORER Token — Discovery & Documentation**
- Rewards collection and verification of ecosystem data
- Focus: Microbial, fungal, faunal, floral biodiversity surveys; soil & water tests
- Provides foundational data for ecological valuation

**🌾 REGEN Token — Restoration & Recovery**
- Rewards measurable improvements in ecosystem health
- Focus: Soil carbon increases, water infiltration/retention, species return, habitat connectivity
- Quantified through geo-tagged, time-stamped before/after data and ecological models

**🛡 GUARDIAN Token — Stewardship & Continuity**
- Rewards long-term care and ecosystem resilience
- Focus: Sustained biodiversity, microbial activity, no net degradation
- Includes time-weighted multipliers for continuous stewardship

---

## Technical Architecture

The EHDC ecosystem is being built on a modern, scalable, and decentralized technology stack.

### Technology Stack

- **Backend**: Node.js 18+ + TypeScript + Fastify
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Primary Ledger**: **XRP Ledger (XRPL)**
- **AI**: Claude API integration for synthesis (planned)

### Why XRP Ledger?

We have strategically chosen the XRPL as our primary settlement layer for three critical reasons:

1. **Direct Stablecoin Integration**: XRPL's native RLUSD provides a compliant, secure path for the future 81/19 economic model
2. **Fit-for-Purpose Smart Contracts**: XRPL Hooks are designed for secure, efficient, embedded transactional logic—perfect for our rule-based token distribution
3. **High Performance, Low Cost**: Near-zero transaction costs and 3-5 second settlement for high-volume, low-value interactions

---

## Development Status: MVP in Progress

**Current Version**: 0.1.0 (MVP Implementation Complete)

### ✅ Implemented Features

The MVP proves the core value loop: **User contributes → Steward verifies → User receives token reward**

**Completed**:
- User Authentication (registration, login with JWT)
- Geographic Communities (country/region/category hierarchy)
- Threaded Discussions (posts with unlimited nesting depth)
- Synthesis System (steward-triggered manual synthesis, ready for Claude API)
- Role-Based Access (USER, STEWARD, ADMIN roles)
- XRPL Database Schema (wallet address integration ready)
- RESTful API (complete CRUD operations for all core entities)
- Docker Support (one-command development environment)
- Database Seed (test accounts and sample data)

**In Progress**:
- XRPL Wallet Linking (connect user accounts to XRPL testnet wallets)
- Token Reward Mechanism (mint and distribute EXPLORER tokens for verified contributions)

### 🚧 Deliberately Deferred (Future Phases)

The MVP intentionally focuses on core functionality and defers:
- Frontend React + Next.js web interface (Phase 2)
- Automated AI synthesis with Claude API (Phase 2)
- Advanced privacy (ZKPs, etc.) (Phase 3)
- Full DAO governance (Phase 3)
- IPFS decentralized storage (Phase 3)
- 81/19 stablecoin model (Phase 4)
- Mobile applications (Phase 4)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional but recommended)
- XRPL Testnet wallet (for token integration testing)

### Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/dj-ccs/EHDC.git
cd EHDC/platforms/brother-nature/core

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration (DATABASE_URL, JWT_SECRET, XRPL credentials)

# 4. Start PostgreSQL and Redis
# Option A: Use Docker Compose for just the databases
docker-compose up postgres redis -d

# Option B: Install and start PostgreSQL and Redis locally

# 5. Run database migrations
npx prisma migrate dev --name init

# 6. Generate Prisma Client
npx prisma generate

# 7. Seed database with test data
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
```

### Test Accounts

After seeding the database, you can login with:

- **Admin**: `admin@brothernature.org` / `admin123`
- **Steward**: `steward@brothernature.org` / `steward123`
- **User**: `farmer@example.com` / `user123`

---

## API Documentation

The Brother Nature platform exposes a RESTful API for all core operations.

### Base URL
```
http://localhost:3000/api
```

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns JWT token)
- `GET /api/auth/me` - Get current user profile (requires auth)

### Communities (`/api/communities`)

- `POST /api/communities` - Create community (requires STEWARD role)
- `GET /api/communities` - List all communities
- `GET /api/communities/:slug` - Get community by slug
- `POST /api/communities/:communityId/join` - Join community (requires auth)

### Posts (`/api/posts`)

- `POST /api/posts` - Create post or reply (requires auth)
- `GET /api/posts/community/:communityId` - Get posts for community
- `GET /api/posts/:postId` - Get post with full thread
- `PUT /api/posts/:postId` - Update post (requires auth, must be author)
- `DELETE /api/posts/:postId` - Delete post (requires auth, must be author)

### Synthesis (`/api/synthesis`)

- `POST /api/synthesis/trigger` - Trigger synthesis for thread (requires STEWARD role)
- `GET /api/synthesis/thread/:threadRootId` - Get synthesis artifacts for thread
- `GET /api/synthesis/:artifactId` - Get specific synthesis artifact
- `GET /api/synthesis` - List recent synthesis artifacts

See [platforms/brother-nature/README.md](platforms/brother-nature/README.md) for detailed API documentation.

---

## Roadmap

### Phase 1: Core MVP ✅ (Q1 2025 - Complete)
- ✅ User authentication and authorization
- ✅ Geographic community structure
- ✅ Threaded discussion system
- ✅ Manual synthesis workflow
- 🚧 XRPL wallet integration (in progress)
- 🚧 Token reward mechanism (in progress)

### Phase 2: Platform Enhancement (Q2 2025)
- Frontend React + Next.js web interface
- Claude API integration for automated synthesis
- Real-time updates with Socket.io
- Enhanced search and discovery

### Phase 3: Token Economy (Q3 2025)
- Full XRPL token distribution (EXPLORER, REGEN, GUARDIAN)
- Contribution verification workflows
- Token governance mechanisms
- Analytics dashboard

### Phase 4: Decentralization & Scale (Q4 2025)
- IPFS content storage
- Mobile applications (iOS/Android)
- Full DAO governance
- 81/19 stablecoin integration
- Cross-platform federation

---

## Guiding Principles

- **Verifiability is Vital**: All health claims must be independently validated with consensus
- **Open Access & Interoperability**: Regenerative systems must remain free and forkable
- **Stewardship over Ownership**: Value belongs with local stewards, with individual rights to earned currency and data sovereignty
- **Earth First**: Incentives prioritize biospheric flourishing through objective value creation

---

## Contributing

We welcome contributions from developers, ecologists, economists, and community organizers!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Public Domain Declaration

This project is dedicated to the **public domain** under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

You are free to:
- Use, modify, remix, and commercialize without restriction
- Integrate with open or proprietary systems
- Build regenerative economies using these concepts and code

**Guiding Principle**: Prioritize Earth's vitality in all applications.

See the [Public Domain Declaration](public_domain_declaration.pdf) for details.

---

## Documentation & Resources

- **WIPO Publication**: [WO2024155705](https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024155705)
- **Ecological Research**: [Darryl's ResearchGate Profile](https://www.researchgate.net/profile/Darryl-Nicke-Ii/research)
- **UCF Framework**: [Unified Conscious Evolution Framework](https://github.com/dj-ccs/Unified-Conscious-Evolution-Framework) (broader vision)
- **Brother Nature Platform**: [platforms/brother-nature/README.md](platforms/brother-nature/README.md)

---

## License

**CC0 1.0 Universal (No Rights Reserved)**
See [LICENSE](LICENSE) or [creativecommons.org/publicdomain/zero/1.0](https://creativecommons.org/publicdomain/zero/1.0/).

---

## Contact

- **Darryl J. Nicke II** — [djnicke@carboncaptureshield.com](mailto:djnicke@carboncaptureshield.com)
- **Carbon Capture Shield Inc.** — [https://carboncaptureshield.com](https://www.carboncaptureshield.com)

---

> "**Let the currency of regeneration flow where life is restored.**"
