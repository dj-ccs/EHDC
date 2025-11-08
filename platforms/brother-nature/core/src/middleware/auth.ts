import { FastifyRequest, FastifyReply } from 'fastify';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Missing token' });

    const token = authHeader.split(' ')[1];
    
    // The payload is verified asynchronously.
    const payload = await request.server.jwt.verify(token);

    // We use 'as any' to force the assignment, trusting that our type augmentation in src/index.ts is correct
    (request.user as any) = payload; 
    
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};

export const requireSteward = async (request: FastifyRequest, reply: FastifyReply) => {
  await authenticate(request, reply);
  if (reply.sent) return;
  
  // Cast request.user to 'any' to access its properties without TypeScript errors
  const user = request.user as any; 
  
  if (!user || (user.role !== 'STEWARD' && user.role !== 'ADMIN')) {
    return reply.status(403).send({ error: 'Requires STEWARD or ADMIN' });
  }
};

export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  await authenticate(request, reply);
  if (reply.sent) return;
  
  // Cast request.user to 'any' to access its properties without TypeScript errors
  if (!(request.user as any) || (request.user as any).role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Requires ADMIN' });
  }
};