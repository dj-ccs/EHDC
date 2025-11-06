import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hashPassword, comparePassword } from '../utils/password';
import { registerSchema, loginSchema } from '../utils/validation';
import { authenticate } from '../middleware/auth';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findFirst({
        where: {
          OR: [{ email: body.email }, { username: body.username }],
        },
      });

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Email or username already exists',
        });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(body.password);

      const user = await fastify.prisma.user.create({
        data: {
          email: body.email,
          username: body.username,
          passwordHash,
          displayName: body.displayName || body.username,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      return reply.status(201).send({
        user,
        token,
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
        message: 'Failed to register user',
      });
    }
  });

  // Login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValid = await comparePassword(body.password, user.passwordHash);

      if (!isValid) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Update last login
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          xrplWalletAddress: user.xrplWalletAddress,
        },
        token,
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
        message: 'Failed to login',
      });
    }
  });

  // Get current user profile
  fastify.get(
    '/me',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user!.id },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            bio: true,
            location: true,
            xrplWalletAddress: true,
            role: true,
            isVerified: true,
            createdAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        return reply.send({ user });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch user profile',
        });
      }
    }
  );

  // Link XRPL wallet to user account
  fastify.post(
    '/wallet/link',
    { preHandler: authenticate },
    async (request: FastifyRequest<{
      Body: { xrplWalletAddress: string };
    }>, reply: FastifyReply) => {
      try {
        const { xrplWalletAddress } = request.body;

        // Basic validation of XRPL address format
        if (!xrplWalletAddress || !xrplWalletAddress.startsWith('r')) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: 'Invalid XRPL wallet address format',
          });
        }

        // Check if wallet is already linked to another user
        const existingWallet = await fastify.prisma.user.findUnique({
          where: { xrplWalletAddress },
        });

        if (existingWallet && existingWallet.id !== request.user!.id) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'This wallet is already linked to another account',
          });
        }

        // Update user's wallet address
        const updatedUser = await fastify.prisma.user.update({
          where: { id: request.user!.id },
          data: { xrplWalletAddress },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            xrplWalletAddress: true,
          },
        });

        return reply.send({
          message: 'XRPL wallet linked successfully',
          user: updatedUser,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to link wallet',
        });
      }
    }
  );

  // Unlink XRPL wallet from user account
  fastify.delete(
    '/wallet/unlink',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const updatedUser = await fastify.prisma.user.update({
          where: { id: request.user!.id },
          data: { xrplWalletAddress: null },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            xrplWalletAddress: true,
          },
        });

        return reply.send({
          message: 'XRPL wallet unlinked successfully',
          user: updatedUser,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to unlink wallet',
        });
      }
    }
  );

  // Get user's token balances (if wallet is linked)
  fastify.get(
    '/wallet/balances',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user!.id },
          select: { xrplWalletAddress: true },
        });

        if (!user || !user.xrplWalletAddress) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'No XRPL wallet linked to this account',
          });
        }

        // Get token rewards history
        const rewards = await fastify.prisma.tokenReward.findMany({
          where: {
            userId: request.user!.id,
            status: 'CONFIRMED',
          },
          select: {
            tokenType: true,
            amount: true,
            xrplTxHash: true,
            reason: true,
            confirmedAt: true,
          },
          orderBy: { confirmedAt: 'desc' },
        });

        // Calculate totals by token type
        const totals = rewards.reduce((acc, reward) => {
          const amount = parseFloat(reward.amount);
          acc[reward.tokenType] = (acc[reward.tokenType] || 0) + amount;
          return acc;
        }, {} as Record<string, number>);

        return reply.send({
          walletAddress: user.xrplWalletAddress,
          balances: {
            EXPLORER: totals.EXPLORER || 0,
            REGEN: totals.REGEN || 0,
            GUARDIAN: totals.GUARDIAN || 0,
          },
          recentRewards: rewards.slice(0, 10), // Last 10 rewards
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch balances',
        });
      }
    }
  );
}
