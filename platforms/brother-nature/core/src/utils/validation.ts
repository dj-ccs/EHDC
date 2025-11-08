import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Community schemas
export const createCommunitySchema = z.object({
  country: z.string().min(2).max(3),
  region: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

// Post schemas
export const createPostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(50000),
  communityId: z.string().cuid(),
  parentPostId: z.string().cuid().optional(),
  contentType: z.enum(['markdown', 'plain', 'html']).default('markdown'),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(50000).optional(),
});

// Synthesis schemas
export const triggerSynthesisSchema = z.object({
  threadRootId: z.string().cuid(),
  synthesisType: z.enum(['thread', 'community', 'topic']).default('thread'),
});

// Wallet verification schemas
export const walletChallengeSchema = z.object({
  xrplWalletAddress: z.string().regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/),
});

export const walletVerifySchema = z.object({
  nonce: z.string().length(64).regex(/^[0-9a-f]{64}$/), // 32-byte hex string
  xrplWalletAddress: z.string().regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/),
  signature: z.string().min(1),
  publicKey: z.string().min(1),
});
