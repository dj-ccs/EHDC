# Brother Nature Platform

A decentralized knowledge sharing and community platform for the EHDC ecosystem.

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

- **Backend**: Node.js + TypeScript + Fastify
- **Database**: PostgreSQL (with migration path to distributed storage)
- **Search**: Elasticsearch (with distributed search preparation)
- **Real-time**: Socket.io (with P2P upgrade path)
- **Frontend**: React + Next.js
- **Blockchain**: Stellar SDK integration

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/dj-ccs/EHDC.git
cd EHDC/platforms/brother-nature/core

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
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

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/brother_nature"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Stellar
STELLAR_NETWORK="testnet"
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_ISSUER_SECRET="YOUR_SECRET_KEY"

# Storage
IPFS_API_URL="http://localhost:5001"
AWS_S3_BUCKET="brother-nature-assets"

# App
APP_URL="https://www.carboncaptureshield.com"
JWT_SECRET="your-jwt-secret"
```

## API Documentation

### Posts

- `POST /api/posts` - Create a new post
- `GET /api/posts/search` - Search posts
- `GET /api/posts/:id` - Get post details
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Verification

- `POST /api/verify/:contentId` - Verify content
- `GET /api/verifications/:contentId` - Get verification status

### Knowledge Base

- `POST /api/knowledge` - Create knowledge entry
- `GET /api/knowledge/search` - Search knowledge base
- `PUT /api/knowledge/:id` - Update entry

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
