/**
 * EHDC Enhancement 3: Secure Secret Management (Vault Client)
 *
 * This module provides a unified interface for fetching secrets from secure storage.
 *
 * DEVELOPMENT MODE: Secrets are safely retrieved from process.env
 * PRODUCTION MODE: Secrets are fetched from an external secure vault (Supabase/HashiCorp)
 *
 * SECURITY RATIONALE:
 * - Eliminates direct process.env access in production code
 * - Centralizes secret management for audit and monitoring
 * - Enables runtime secret rotation without code changes
 * - Provides foundation for mainnet deployment security
 *
 * ADR-0002 Compliance: Production secrets MUST NOT be in source code or exposed via process.env
 */

/**
 * Configuration for external vault providers
 */
interface VaultConfig {
  provider: 'supabase' | 'hashicorp' | 'mock';
  endpoint?: string;
  token?: string;
}

/**
 * VaultClient: Secure secret retrieval with environment-aware implementation
 */
export class VaultClient {
  private static config: VaultConfig | null = null;

  /**
   * Initialize the vault client with production configuration
   * This should be called during application startup
   *
   * @param config - Vault provider configuration
   */
  static initialize(config: VaultConfig): void {
    this.config = config;
  }

  /**
   * Retrieve a secret from the appropriate storage backend
   *
   * DEVELOPMENT: Fetches from process.env (safe for local dev only)
   * PRODUCTION: Fetches from configured external vault
   *
   * @param key - The secret key to retrieve (e.g., 'XRPL_ISSUER_SECRET')
   * @returns Promise<string> - The secret value
   * @throws Error if secret cannot be retrieved
   */
  static async getSecret(key: string): Promise<string> {
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'development' || nodeEnv === 'test') {
      return this.getSecretFromEnv(key);
    } else {
      return this.getSecretFromVault(key);
    }
  }

  /**
   * DEVELOPMENT MODE: Fetch secret from process.env
   *
   * This is acceptable ONLY for local development and testing.
   * Production environments MUST use external vault.
   *
   * @param key - The environment variable name
   * @returns Promise<string> - The secret value
   * @throws Error if secret is not found
   */
  private static async getSecretFromEnv(key: string): Promise<string> {
    const value = process.env[key];

    if (!value) {
      throw new Error(
        `VAULT_CLIENT ERROR: Secret '${key}' not found in environment variables. ` +
        `Please ensure ${key} is set in your .env file.`
      );
    }

    // Log access in development for debugging (NEVER in production)
    if (process.env.VAULT_DEBUG === 'true') {
      console.log(`[VaultClient:DEV] Retrieved secret: ${key}`);
    }

    return value;
  }

  /**
   * PRODUCTION MODE: Fetch secret from external vault provider
   *
   * This method implements the secure production secret retrieval logic.
   * Secrets are fetched from Supabase Vault, HashiCorp Vault, or similar.
   *
   * IMPLEMENTATION STATUS: Architecture placeholder - ready for production integration
   *
   * @param key - The secret key to retrieve
   * @returns Promise<string> - The secret value
   * @throws Error if secret cannot be retrieved or vault is not configured
   */
  private static async getSecretFromVault(key: string): Promise<string> {
    if (!this.config) {
      throw new Error(
        'VAULT_CLIENT ERROR: Vault not initialized. ' +
        'Call VaultClient.initialize() during application startup with production vault configuration.'
      );
    }

    // Production vault implementation based on configured provider
    switch (this.config.provider) {
      case 'supabase':
        return this.fetchFromSupabase(key);

      case 'hashicorp':
        return this.fetchFromHashiCorp(key);

      case 'mock':
        // Mock provider for testing production logic without real vault
        console.warn(`[VaultClient:MOCK] Using mock vault for key: ${key}`);
        return this.getSecretFromEnv(key);

      default:
        throw new Error(`VAULT_CLIENT ERROR: Unknown vault provider: ${this.config.provider}`);
    }
  }

  /**
   * Fetch secret from Supabase Vault
   *
   * Supabase provides a built-in vault API for secure secret storage:
   * https://supabase.com/docs/guides/functions/secrets
   *
   * @param key - The secret key
   * @returns Promise<string> - The secret value
   */
  private static async fetchFromSupabase(key: string): Promise<string> {
    if (!this.config?.endpoint || !this.config?.token) {
      throw new Error('VAULT_CLIENT ERROR: Supabase vault endpoint and token must be configured');
    }

    // Implementation for Supabase Vault API
    // This will be integrated when production vault is configured
    try {
      const response = await fetch(`${this.config.endpoint}/secrets/${key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Supabase vault request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.value) {
        throw new Error(`Secret '${key}' not found in Supabase vault`);
      }

      return data.value;
    } catch (error: any) {
      throw new Error(`VAULT_CLIENT ERROR: Failed to fetch from Supabase: ${error.message}`);
    }
  }

  /**
   * Fetch secret from HashiCorp Vault
   *
   * HashiCorp Vault is an industry-standard secret management system:
   * https://www.vaultproject.io/
   *
   * @param key - The secret key
   * @returns Promise<string> - The secret value
   */
  private static async fetchFromHashiCorp(key: string): Promise<string> {
    if (!this.config?.endpoint || !this.config?.token) {
      throw new Error('VAULT_CLIENT ERROR: HashiCorp vault endpoint and token must be configured');
    }

    // Implementation for HashiCorp Vault API
    // This will be integrated when production vault is configured
    try {
      const response = await fetch(`${this.config.endpoint}/v1/secret/data/${key}`, {
        method: 'GET',
        headers: {
          'X-Vault-Token': this.config.token,
        },
      });

      if (!response.ok) {
        throw new Error(`HashiCorp vault request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data?.data?.value) {
        throw new Error(`Secret '${key}' not found in HashiCorp vault`);
      }

      return data.data.data.value;
    } catch (error: any) {
      throw new Error(`VAULT_CLIENT ERROR: Failed to fetch from HashiCorp: ${error.message}`);
    }
  }
}

/**
 * Convenience function for direct secret retrieval
 * This is the primary interface that services should use
 *
 * @param key - The secret key to retrieve
 * @returns Promise<string> - The secret value
 */
export async function getSecret(key: string): Promise<string> {
  return VaultClient.getSecret(key);
}

/**
 * Initialize the vault client (for production use)
 * Call this during application startup with production configuration
 *
 * @param config - Vault provider configuration
 */
export function initializeVault(config: VaultConfig): void {
  VaultClient.initialize(config);
}
