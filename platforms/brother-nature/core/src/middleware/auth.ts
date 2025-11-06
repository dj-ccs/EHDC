import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      username: string;
      role: UserRole;
    };
  }
}

// Middleware to verify JWT token
export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }
};

// Middleware to check if user is a steward or admin
export const requireSteward = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    const user = request.user;

    if (!user || (user.role !== 'STEWARD' && user.role !== 'ADMIN')) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Steward or Admin role required',
      });
    }
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }
};

// Middleware to check if user is an admin
export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    const user = request.user;

    if (!user || user.role !== 'ADMIN') {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin role required',
      });
    }
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }
};
