import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createPostSchema, updatePostSchema } from '../utils/validation';
import { authenticate } from '../middleware/auth';

export default async function postRoutes(fastify: FastifyInstance) {
  // Create a new post or reply
  fastify.post(
    '/',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createPostSchema.parse(request.body);

        // Verify community exists and user is a member
        const membership = await fastify.prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId: request.user!.id,
              communityId: body.communityId,
            },
          },
        });

        if (!membership) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Must be a community member to post',
          });
        }

        // Calculate thread depth if this is a reply
        let threadDepth = 0;
        if (body.parentPostId) {
          const parentPost = await fastify.prisma.post.findUnique({
            where: { id: body.parentPostId },
            select: { threadDepth: true },
          });

          if (!parentPost) {
            return reply.status(404).send({
              error: 'Not Found',
              message: 'Parent post not found',
            });
          }

          threadDepth = parentPost.threadDepth + 1;
        }

        // Create post
        const post = await fastify.prisma.post.create({
          data: {
            title: body.title,
            content: body.content,
            contentType: body.contentType,
            authorId: request.user!.id,
            communityId: body.communityId,
            parentPostId: body.parentPostId,
            threadDepth,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        });

        return reply.status(201).send({ post });
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
          message: 'Failed to create post',
        });
      }
    }
  );

  // Get posts for a community
  fastify.get('/community/:communityId', async (request: FastifyRequest<{
    Params: { communityId: string };
    Querystring: { page?: string; limit?: string };
  }>, reply: FastifyReply) => {
    try {
      const { communityId } = request.params;
      const page = parseInt(request.query.page || '1', 10);
      const limit = parseInt(request.query.limit || '20', 10);
      const skip = (page - 1) * limit;

      // Get top-level posts only (not replies)
      const posts = await fastify.prisma.post.findMany({
        where: {
          communityId,
          parentPostId: null,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await fastify.prisma.post.count({
        where: {
          communityId,
          parentPostId: null,
        },
      });

      return reply.send({
        posts,
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
        message: 'Failed to fetch posts',
      });
    }
  });

  // Get a single post with its entire thread
  fastify.get('/:postId', async (request: FastifyRequest<{
    Params: { postId: string };
  }>, reply: FastifyReply) => {
    try {
      const { postId } = request.params;

      // Get the post
      const post = await fastify.prisma.post.findUnique({
        where: { id: postId },
        include: {
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
      });

      if (!post) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Post not found',
        });
      }

      // Get all replies recursively
      const replies = await getRepliesRecursive(fastify, postId);

      return reply.send({
        post: {
          ...post,
          replies,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch post',
      });
    }
  });

  // Update a post
  fastify.put(
    '/:postId',
    { preHandler: authenticate },
    async (request: FastifyRequest<{
      Params: { postId: string };
    }>, reply: FastifyReply) => {
      try {
        const { postId } = request.params;
        const body = updatePostSchema.parse(request.body);

        // Check if post exists and user is the author
        const existingPost = await fastify.prisma.post.findUnique({
          where: { id: postId },
        });

        if (!existingPost) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Post not found',
          });
        }

        if (existingPost.authorId !== request.user!.id) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Can only edit your own posts',
          });
        }

        // Update post
        const post = await fastify.prisma.post.update({
          where: { id: postId },
          data: {
            ...body,
            isEdited: true,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        });

        return reply.send({ post });
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
          message: 'Failed to update post',
        });
      }
    }
  );

  // Delete a post
  fastify.delete(
    '/:postId',
    { preHandler: authenticate },
    async (request: FastifyRequest<{
      Params: { postId: string };
    }>, reply: FastifyReply) => {
      try {
        const { postId } = request.params;

        // Check if post exists and user is the author
        const existingPost = await fastify.prisma.post.findUnique({
          where: { id: postId },
        });

        if (!existingPost) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Post not found',
          });
        }

        if (existingPost.authorId !== request.user!.id) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Can only delete your own posts',
          });
        }

        // Delete post (cascade will delete replies)
        await fastify.prisma.post.delete({
          where: { id: postId },
        });

        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete post',
        });
      }
    }
  );
}

// Helper function to get replies recursively
async function getRepliesRecursive(fastify: FastifyInstance, parentId: string): Promise<any[]> {
  const replies = await fastify.prisma.post.findMany({
    where: { parentPostId: parentId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Recursively get nested replies
  const repliesWithNested = await Promise.all(
    replies.map(async (reply) => {
      const nestedReplies = await getRepliesRecursive(fastify, reply.id);
      return {
        ...reply,
        replies: nestedReplies,
      };
    })
  );

  return repliesWithNested;
}
