import { Client, Wallet, Payment, TrustSet } from 'xrpl';
import { PrismaClient, TokenType } from '@prisma/client';
import { getSecret } from '../utils/vault_client';

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
  private isInitialized: boolean = false;

  // Token configuration from vault (secure secret management)
  private tokenConfig: TokenDistribution;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    const serverUrl = process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233';
    this.client = new Client(serverUrl);

    // Token config will be loaded securely via initialize()
    // This prevents direct process.env access for critical secrets
    this.tokenConfig = {
      EXP: { currency: '', issuerAddress: '', issuerSecret: '' },
      RGN: { currency: '', issuerAddress: '', issuerSecret: '' },
      GRD: { currency: '', issuerAddress: '', issuerSecret: '' },
    };
  }

  /**
   * Initialize the XRPL service with secure secret loading from vault
   *
   * SECURITY: This method fetches critical secrets (XRPL_ISSUER_SECRET) from
   * the vault instead of directly from process.env, implementing Enhancement 3.
   *
   * MUST be called after construction and before any token operations.
   *
   * @throws Error if secrets cannot be loaded from vault
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }

    try {
      // Fetch critical issuer secret from vault (Enhancement 3: Secure Secret Management)
      const issuerSecret = await getSecret('XRPL_ISSUER_SECRET');
      const issuerAddress = await getSecret('XRPL_ISSUER_ADDRESS');

      // Non-critical configuration can still come from process.env
      const explorerCurrency = process.env.EXPLORER_TOKEN_CURRENCY || 'EXP';
      const regenCurrency = process.env.REGEN_TOKEN_CURRENCY || 'RGN';
      const guardianCurrency = process.env.GUARDIAN_TOKEN_CURRENCY || 'GRD';

      // Initialize token configurations with vault-sourced secrets
      this.tokenConfig = {
        EXP: {
          currency: explorerCurrency,
          issuerAddress: issuerAddress,
          issuerSecret: issuerSecret,
        },
        RGN: {
          currency: regenCurrency,
          issuerAddress: issuerAddress,
          issuerSecret: issuerSecret,
        },
        GRD: {
          currency: guardianCurrency,
          issuerAddress: issuerAddress,
          issuerSecret: issuerSecret,
        },
      };

      this.isInitialized = true;
      console.log('[XRPLService] Initialized with vault-sourced secrets (Enhancement 3)');
    } catch (error: any) {
      throw new Error(`Failed to initialize XRPLService: ${error.message}`);
    }
  }

  /**
   * Ensure the service is initialized before performing operations
   * @throws Error if service is not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'XRPLService not initialized. Call initialize() before using the service.'
      );
    }
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
    this.ensureInitialized();
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
    this.ensureInitialized();
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
    this.ensureInitialized();
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
   *
   * SECURITY FIX: Uses xrpl.js native Wallet.verify() to eliminate CVSS 9.3
   * elliptic vulnerability from ripple-keypairs dependency.
   *
   * @param message - UTF-8 message that was signed
   * @param signature - Hex-encoded signature
   * @param publicKey - Hex-encoded XRPL public key
   * @returns boolean - true if signature is valid
   */
  verifyWalletSignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      // Convert message to hex format as required by XRPL signing standard
      const messageHex = Buffer.from(message, 'utf8').toString('hex');

      // Use xrpl.js native Wallet.verify() static method
      // This eliminates the ripple-keypairs dependency and its elliptic vulnerability
      return Wallet.verify(messageHex, signature, publicKey);
    } catch (error: any) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify if an XRPL account exists on the ledger
   *
   * NOTE: Despite the method name, XRPL does not expose public keys directly
   * via account_info. This method verifies account existence by returning the
   * address if the account is active, or null if it doesn't exist or is inaccessible.
   *
   * Public keys must be provided by users when signing messages for verification.
   *
   * @param address - The XRPL address to verify
   * @returns The address if account exists and is active, null otherwise
   */
  async getPublicKey(address: string): Promise<string | null> {
    await this.connect();

    try {
      const accountInfo = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });

      // Account exists - return address to indicate success
      // (Public key extraction not possible via account_info API)
      if (accountInfo.result.account_data) {
        return address;
      }
    } catch (error: any) {
      console.error('Failed to verify account existence:', error);
    }

    // Single return point for failure/non-existence (SonarCloud S3516 compliance)
    return null;
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
