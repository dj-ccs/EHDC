import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import communityRoutes from './routes/communities';
import postRoutes from './routes/posts';
import synthesisRoutes from './routes/synthesis';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// Register plugins
const setupPlugins = async () => {
  // Security headers
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

  // CORS
  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // JWT Authentication
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    sign: {
      expiresIn: '7d',
    },
  });

  // Rate limiting
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '15 minutes',
  });
};

// Decorate Fastify with Prisma client
fastify.decorate('prisma', prisma);

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// Register routes
const setupRoutes = async () => {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(communityRoutes, { prefix: '/api/communities' });
  await fastify.register(postRoutes, { prefix: '/api/posts' });
  await fastify.register(synthesisRoutes, { prefix: '/api/synthesis' });
};

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Received shutdown signal, closing connections...');
  await prisma.$disconnect();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    fastify.log.info('Connected to database');

    // Setup plugins
    await setupPlugins();

    // Setup routes
    await setupRoutes();

    // Start listening
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Brother Nature Platform running on http://${host}:${port}`);
    fastify.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    fastify.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { fastify, prisma };
