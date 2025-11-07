import { Client, Wallet, Payment, TrustSet, verify } from 'xrpl';
import { PrismaClient, TokenType } from '@prisma/client';

interface TokenConfig {
  currency: string;
  issuerAddress: string;
  issuerSecret: string;
}

interface TokenDistribution {
  EXP: TokenConfig;
  RGN: TokenConfig;
  GRD: TokenConfig;
}

export class XRPLService {
  private client: Client;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  // Token configuration from environment
  private tokenConfig: TokenDistribution;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    const serverUrl = process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233';
    this.client = new Client(serverUrl);

    // Initialize token configurations
    this.tokenConfig = {
      EXP: {
        currency: process.env.EXPLORER_TOKEN_CURRENCY || 'EXP',
        issuerAddress: process.env.XRPL_ISSUER_ADDRESS || '',
        issuerSecret: process.env.XRPL_ISSUER_SECRET || '',
      },
      RGN: {
        currency: process.env.REGEN_TOKEN_CURRENCY || 'RGN',
        issuerAddress: process.env.XRPL_ISSUER_ADDRESS || '',
        issuerSecret: process.env.XRPL_ISSUER_SECRET || '',
      },
      GRD: {
        currency: process.env.GUARDIAN_TOKEN_CURRENCY || 'GRD',
        issuerAddress: process.env.XRPL_ISSUER_ADDRESS || '',
        issuerSecret: process.env.XRPL_ISSUER_SECRET || '',
      },
    };
  }

  /**
   * Connect to XRPL
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to XRPL');
    } catch (error) {
      console.error('Failed to connect to XRPL:', error);
      throw new Error('XRPL connection failed');
    }
  }

  /**
   * Disconnect from XRPL
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('Disconnected from XRPL');
    } catch (error) {
      console.error('Failed to disconnect from XRPL:', error);
    }
  }

  /**
   * Create a trustline from a user's wallet to the token issuer
   * This is required before a user can receive custom tokens
   */
  async createTrustline(
    userWallet: Wallet,
    tokenType: TokenType
  ): Promise<string> {
    await this.connect();

    const config = this.getTokenConfig(tokenType);

    const trustSet: TrustSet = {
      TransactionType: 'TrustSet',
      Account: userWallet.address,
      LimitAmount: {
        currency: config.currency,
        issuer: config.issuerAddress,
        value: '10000000', // Maximum trust limit
      },
    };

    try {
      const prepared = await this.client.autofill(trustSet);
      const signed = userWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if (result.result.meta && typeof result.result.meta === 'object') {
        if ('TransactionResult' in result.result.meta) {
          if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            return result.result.hash;
          }
        }
      }

      throw new Error('Trustline creation failed');
    } catch (error: any) {
      console.error('Trustline creation error:', error);
      throw new Error(`Failed to create trustline: ${error.message}`);
    }
  }

  /**
   * Send tokens from issuer to user
   */
  async sendTokenReward(
    recipientAddress: string,
    amount: string,
    tokenType: TokenType,
    reason: string,
    userId: string,
    postId?: string
  ): Promise<string> {
    await this.connect();

    const config = this.getTokenConfig(tokenType);
    const issuerWallet = Wallet.fromSeed(config.issuerSecret);

    // Create TokenReward record in database
    const reward = await this.prisma.tokenReward.create({
      data: {
        userId,
        tokenType,
        amount,
        xrplDestination: recipientAddress,
        xrplIssuer: config.issuerAddress,
        xrplCurrency: config.currency,
        reason,
        postId,
        status: 'PROCESSING',
      },
    });

    try {
      // Prepare payment transaction
      const payment: Payment = {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: recipientAddress,
        Amount: {
          currency: config.currency,
          value: amount,
          issuer: config.issuerAddress,
        },
      };

      const prepared = await this.client.autofill(payment);
      const signed = issuerWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      // Check if transaction succeeded
      if (result.result.meta && typeof result.result.meta === 'object') {
        if ('TransactionResult' in result.result.meta) {
          if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            // Update reward record with success
            await this.prisma.tokenReward.update({
              where: { id: reward.id },
              data: {
                xrplTxHash: result.result.hash,
                status: 'CONFIRMED',
                processedAt: new Date(),
                confirmedAt: new Date(),
              },
            });

            return result.result.hash;
          }
        }
      }

      // Transaction failed
      throw new Error('Transaction not successful');
    } catch (error: any) {
      console.error('Token send error:', error);

      // Update reward record with failure
      await this.prisma.tokenReward.update({
        where: { id: reward.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          processedAt: new Date(),
        },
      });

      throw new Error(`Failed to send token: ${error.message}`);
    }
  }

  /**
   * Get account balance for a specific token
   */
  async getTokenBalance(
    accountAddress: string,
    tokenType: TokenType
  ): Promise<string> {
    await this.connect();

    const config = this.getTokenConfig(tokenType);

    try {
      const balances = await this.client.request({
        command: 'account_lines',
        account: accountAddress,
        ledger_index: 'validated',
      });

      const tokenLine = balances.result.lines.find(
        (line: any) =>
          line.currency === config.currency &&
          line.account === config.issuerAddress
      );

      return tokenLine ? tokenLine.balance : '0';
    } catch (error: any) {
      console.error('Balance fetch error:', error);
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  }

  /**
   * Verify an XRPL transaction
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    await this.connect();

    try {
      const tx = await this.client.request({
        command: 'tx',
        transaction: txHash,
      });

      if (tx.result.meta && typeof tx.result.meta === 'object') {
        if ('TransactionResult' in tx.result.meta) {
          return tx.result.meta.TransactionResult === 'tesSUCCESS';
        }
      }

      return false;
    } catch (error) {
      console.error('Transaction verification error:', error);
      return false;
    }
  }

  /**
   * Get token configuration for a specific token type
   */
  private getTokenConfig(tokenType: TokenType): TokenConfig {
    const currencyCode = tokenType === 'EXPLORER' ? 'EXP' :
                        tokenType === 'REGEN' ? 'RGN' : 'GRD';

    return this.tokenConfig[currencyCode];
  }

  /**
   * Reward a user for a verified contribution
   * This is the main entry point for the MVP reward system
   */
  async rewardVerifiedContribution(
    userId: string,
    postId: string,
    amount: string = '10'
  ): Promise<string> {
    // Get user's XRPL wallet address
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xrplWalletAddress: true, username: true },
    });

    if (!user || !user.xrplWalletAddress) {
      throw new Error('User must link XRPL wallet before receiving rewards');
    }

    // For MVP, we reward EXPLORER tokens for all contributions
    const tokenType: TokenType = 'EXPLORER';
    const reason = `Verified contribution in post ${postId}`;

    return this.sendTokenReward(
      user.xrplWalletAddress,
      amount,
      tokenType,
      reason,
      userId,
      postId
    );
  }

  /**
   * Verify a signature from an XRPL wallet
   * This proves that the user owns the private key for the claimed address
   */
  verifyWalletSignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      // Use XRPL's native signature verification (top-level export)
      return verify(message, signature, publicKey);
    } catch (error: any) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get the public key for an XRPL address
   * Required for signature verification
   */
  async getPublicKey(address: string): Promise<string | null> {
    await this.connect();

    try {
      // Note: XRPL does not expose public keys directly via account_info
      // Public keys must be provided by the user when signing messages
      // This method is kept for potential future enhancement
      // For now, users must provide their public key during verification

      const accountInfo = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });

      // Verify account exists
      if (accountInfo.result.account_data) {
        // Public key would need to be extracted from transaction history
        // which is beyond the scope of this method
        return null;
      }

      return null;
    } catch (error: any) {
      console.error('Failed to fetch account info:', error);
      return null;
    }
  }

  /**
   * Generate a challenge message for wallet verification
   * Returns a formatted message that should be signed by the user's wallet
   */
  static generateChallengeMessage(nonce: string, xrplAddress: string): string {
    return `Brother Nature Wallet Verification

Please sign this message to verify ownership of your XRPL wallet.

Wallet Address: ${xrplAddress}
Verification Code: ${nonce}
Timestamp: ${new Date().toISOString()}

This request will expire in 5 minutes.`;
  }
}
