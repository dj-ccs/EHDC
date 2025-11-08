import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hashPassword, comparePassword } from '../utils/password';
import { registerSchema, loginSchema, walletChallengeSchema, walletVerifySchema } from '../utils/validation';
import { authenticate } from '../middleware/auth';
import { XRPLService } from '../services/xrpl.service';
import crypto from 'crypto';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

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

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      }, { expiresIn: '7d' });

      return reply.status(201).send({ user, token });
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

      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

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

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      }, { expiresIn: '7d' });

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
          where: { id: request.user.id },
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

  // Generate challenge for wallet verification (Step 1 of 2)
  fastify.post(
    '/wallet/challenge',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = walletChallengeSchema.parse(request.body);

        const existingWallet = await fastify.prisma.user.findUnique({
          where: { xrplWalletAddress: body.xrplWalletAddress },
        });

        if (existingWallet && existingWallet.id !== request.user.id) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'This wallet is already linked to another account',
          });
        }

        const nonce = crypto.randomBytes(32).toString('hex');

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const message = XRPLService.generateChallengeMessage(
          nonce,
          body.xrplWalletAddress
        );

        const challenge = await fastify.prisma.walletChallenge.create({
          data: {
            nonce,
            message,
            xrplAddress: body.xrplWalletAddress,
            userId: request.user.id,
            expiresAt,
          },
        });

        return reply.send({
          nonce: challenge.nonce,
          message: challenge.message,
          expiresAt: challenge.expiresAt,
          instructions: 'Sign this message with your XRPL wallet and submit the signature to /api/auth/wallet/verify',
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
          message: 'Failed to generate challenge',
        });
      }
    }
  );

  // Verify wallet ownership with signature (Step 2 of 2)
  fastify.post(
    '/wallet/verify',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = walletVerifySchema.parse(request.body);

        const challenge = await fastify.prisma.walletChallenge.findUnique({
          where: { nonce: body.nonce },
        });

        if (!challenge) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Challenge not found',
          });
        }

        if (challenge.userId !== request.user.id) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Challenge does not belong to this user',
          });
        }

        if (new Date() > challenge.expiresAt) {
          return reply.status(400).send({
            error: 'Expired',
            message: 'Challenge has expired. Please request a new one.',
          });
        }

        if (challenge.isUsed) {
          return reply.status(400).send({
            error: 'Invalid',
            message: 'Challenge has already been used',
          });
        }

        if (challenge.xrplAddress !== body.xrplWalletAddress) {
          return reply.status(400).send({
            error: 'Mismatch',
            message: 'XRPL address does not match challenge',
          });
        }

        const xrplService = new XRPLService(fastify.prisma);
        const isValid = xrplService.verifyWalletSignature(
          challenge.message,
          body.signature,
          body.publicKey
        );

        if (!isValid) {
          return reply.status(400).send({
            error: 'Invalid Signature',
            message: 'Signature verification failed. Please ensure you signed the correct message.',
          });
        }

        await fastify.prisma.walletChallenge.update({
          where: { id: challenge.id },
          data: {
            isUsed: true,
            isVerified: true,
            verifiedAt: new Date(),
          },
        });

        const updatedUser = await fastify.prisma.user.update({
          where: { id: request.user.id },
          data: { xrplWalletAddress: body.xrplWalletAddress },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            xrplWalletAddress: true,
          },
        });

        return reply.send({
          message: 'XRPL wallet verified and linked successfully',
          user: updatedUser,
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
          message: 'Failed to verify wallet',
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
          where: { id: request.user.id },
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
          where: { id: request.user.id },
          select: { xrplWalletAddress: true },
        });

        if (!user || !user.xrplWalletAddress) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'No XRPL wallet linked to this account',
          });
        }

        const rewards = await fastify.prisma.tokenReward.findMany({
          where: {
            userId: request.user.id,
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
          recentRewards: rewards.slice(0, 10),
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