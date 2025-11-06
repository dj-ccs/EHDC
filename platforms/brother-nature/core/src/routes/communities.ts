import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createCommunitySchema } from '../utils/validation';
import { authenticate, requireSteward } from '../middleware/auth';

export default async function communityRoutes(fastify: FastifyInstance) {
  // Create a new community (requires steward role)
  fastify.post(
    '/',
    { preHandler: requireSteward },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createCommunitySchema.parse(request.body);

        // Generate slug from geographic hierarchy
        const slugParts = [
          body.country,
          body.region,
          body.category,
        ].filter(Boolean);
        const slug = slugParts.join('-').toLowerCase().replace(/\s+/g, '-');

        // Check if community already exists
        const existing = await fastify.prisma.community.findUnique({
          where: { slug },
        });

        if (existing) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'Community with this geographic path already exists',
          });
        }

        // Create community
        const community = await fastify.prisma.community.create({
          data: {
            country: body.country,
            region: body.region,
            category: body.category,
            name: body.name,
            description: body.description,
            slug,
          },
        });

        // Auto-join creator as steward
        await fastify.prisma.communityMember.create({
          data: {
            userId: request.user!.id,
            communityId: community.id,
            role: 'STEWARD',
          },
        });

        return reply.status(201).send({ community });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create community',
        });
      }
    }
  );

  // Get all communities
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const communities = await fastify.prisma.community.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { members: true, posts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ communities });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch communities',
      });
    }
  });

  // Get community by slug
  fastify.get('/:slug', async (request: FastifyRequest<{
    Params: { slug: string };
  }>, reply: FastifyReply) => {
    try {
      const { slug } = request.params;

      const community = await fastify.prisma.community.findUnique({
        where: { slug },
        include: {
          _count: {
            select: { members: true, posts: true },
          },
        },
      });

      if (!community) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Community not found',
        });
      }

      return reply.send({ community });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch community',
      });
    }
  });

  // Join a community
  fastify.post(
    '/:communityId/join',
    { preHandler: authenticate },
    async (request: FastifyRequest<{
      Params: { communityId: string };
    }>, reply: FastifyReply) => {
      try {
        const { communityId } = request.params;

        // Check if community exists
        const community = await fastify.prisma.community.findUnique({
          where: { id: communityId },
        });

        if (!community) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Community not found',
          });
        }

        // Check if already a member
        const existingMember = await fastify.prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId: request.user!.id,
              communityId,
            },
          },
        });

        if (existingMember) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'Already a member of this community',
          });
        }

        // Join community
        const membership = await fastify.prisma.communityMember.create({
          data: {
            userId: request.user!.id,
            communityId,
            role: 'MEMBER',
          },
        });

        return reply.status(201).send({ membership });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to join community',
        });
      }
    }
  );
}
