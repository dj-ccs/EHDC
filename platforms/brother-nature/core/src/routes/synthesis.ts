import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { triggerSynthesisSchema } from '../utils/validation';
import { requireSteward } from '../middleware/auth';
import { XRPLService } from '../services/xrpl.service';

export default async function synthesisRoutes(fastify: FastifyInstance) {
  // Trigger synthesis for a thread (steward only)
  fastify.post(
    '/trigger',
    { preHandler: requireSteward },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = triggerSynthesisSchema.parse(request.body);

        // Verify thread root exists
        const threadRoot = await fastify.prisma.post.findUnique({
          where: { id: body.threadRootId },
          include: {
            community: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        });

        if (!threadRoot) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Thread root post not found',
          });
        }

        // Get all posts in the thread
        const threadPosts = await getThreadPosts(fastify, body.threadRootId);

        // For MVP, create a simple synthesis
        // In production, this would call Claude API or similar
        const synthesis = await generateSynthesis(threadRoot, threadPosts);

        // Save synthesis artifact
        const artifact = await fastify.prisma.synthesisArtifact.create({
          data: {
            title: synthesis.title,
            summary: synthesis.summary,
            keyPoints: synthesis.keyPoints, // PostgreSQL native array type
            synthesisType: body.synthesisType,
            aiModel: 'manual-mvp',
            threadRootId: body.threadRootId,
            createdById: request.user!.id,
          },
          include: {
            threadRoot: {
              select: {
                id: true,
                title: true,
                community: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            createdBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        });

        // Award EXPLORER tokens to the thread author for verified contribution
        let rewardTxHash: string | null = null;
        try {
          const xrplService = new XRPLService(fastify.prisma);
          rewardTxHash = await xrplService.rewardVerifiedContribution(
            threadRoot.authorId,
            body.threadRootId,
            '10' // 10 EXPLORER tokens for verified contribution
          );

          fastify.log.info(`Rewarded ${threadRoot.author.username} with 10 EXPLORER tokens. TX: ${rewardTxHash}`);
        } catch (rewardError: any) {
          // Log error but don't fail the synthesis
          fastify.log.error(`Failed to send token reward: ${rewardError.message}`);
          // Token reward will remain in FAILED status in database
        }

        return reply.status(201).send({
          artifact,
          metadata: {
            postsAnalyzed: threadPosts.length + 1, // +1 for root post
            threadDepth: Math.max(...threadPosts.map((p) => p.threadDepth), 0),
          },
          reward: rewardTxHash ? {
            txHash: rewardTxHash,
            amount: '10',
            tokenType: 'EXPLORER',
            recipient: threadRoot.author.username,
          } : null,
        });
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
          message: 'Failed to trigger synthesis',
        });
      }
    }
  );

  // Get synthesis artifacts for a thread
  fastify.get('/thread/:threadRootId', async (request: FastifyRequest<{
    Params: { threadRootId: string };
  }>, reply: FastifyReply) => {
    try {
      const { threadRootId } = request.params;

      const artifacts = await fastify.prisma.synthesisArtifact.findMany({
        where: { threadRootId },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ artifacts });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch synthesis artifacts',
      });
    }
  });

  // Get a specific synthesis artifact
  fastify.get('/:artifactId', async (request: FastifyRequest<{
    Params: { artifactId: string };
  }>, reply: FastifyReply) => {
    try {
      const { artifactId } = request.params;

      const artifact = await fastify.prisma.synthesisArtifact.findUnique({
        where: { id: artifactId },
        include: {
          threadRoot: {
            select: {
              id: true,
              title: true,
              content: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
              community: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      if (!artifact) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Synthesis artifact not found',
        });
      }

      return reply.send({ artifact });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch synthesis artifact',
      });
    }
  });

  // Get all recent synthesis artifacts
  fastify.get('/', async (request: FastifyRequest<{
    Querystring: { page?: string; limit?: string };
  }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1', 10);
      const limit = parseInt(request.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      const artifacts = await fastify.prisma.synthesisArtifact.findMany({
        include: {
          threadRoot: {
            select: {
              id: true,
              title: true,
              community: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await fastify.prisma.synthesisArtifact.count();

      return reply.send({
        artifacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch synthesis artifacts',
      });
    }
  });
}

// Helper function to get all posts in a thread
async function getThreadPosts(
  fastify: FastifyInstance,
  parentId: string
): Promise<any[]> {
  const replies = await fastify.prisma.post.findMany({
    where: { parentPostId: parentId },
    include: {
      author: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  const allPosts = [...replies];

  // Recursively get nested replies
  for (const reply of replies) {
    const nestedPosts = await getThreadPosts(fastify, reply.id);
    allPosts.push(...nestedPosts);
  }

  return allPosts;
}

// MVP synthesis generator (placeholder for AI integration)
async function generateSynthesis(
  threadRoot: any,
  threadPosts: any[]
): Promise<{
  title: string;
  summary: string;
  keyPoints: string[];
}> {
  // In production, this would call Claude API or similar
  // For MVP, generate a simple summary

  const participantCount = new Set([
    threadRoot.author.username,
    ...threadPosts.map((p) => p.author.username),
  ]).size;

  const title = `Synthesis: ${threadRoot.title || 'Thread Discussion'}`;

  const summary = `This thread, initiated by ${threadRoot.author.displayName || threadRoot.author.username}, generated ${threadPosts.length} responses from ${participantCount} community members. The discussion covers topics related to ${threadRoot.community.name}.`;

  const keyPoints = [
    `Initial post by ${threadRoot.author.displayName || threadRoot.author.username}`,
    `${threadPosts.length} total responses`,
    `${participantCount} unique participants`,
    `Discussion in ${threadRoot.community.name} community`,
  ];

  // TODO: Replace with actual AI synthesis using Claude API
  // This would involve:
  // 1. Collecting all post content
  // 2. Sending to Claude API with synthesis prompt
  // 3. Extracting key insights, themes, and actionable items
  // 4. Identifying potential value creation opportunities

  return { title, summary, keyPoints };
}
