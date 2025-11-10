-- AlterTable: Add XPR Master Identity Foundation fields to User model
-- ADR-0701: XPR Master Identity Architecture - Non-Custodial Multi-Chain Key Management
-- ADR-0702: Multi-Chain Account Stewardship

ALTER TABLE "User" ADD COLUMN "encryptedKeyBundle" TEXT;
ALTER TABLE "User" ADD COLUMN "keyDerivationPath" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "User"."encryptedKeyBundle" IS 'Client-side encrypted multi-chain key bundle (AES-256-GCM). Platform stores ciphertext only, cannot decrypt without user passphrase. See ADR-0701.';
COMMENT ON COLUMN "User"."keyDerivationPath" IS 'BIP-44 derivation metadata (JSON). Contains derivation paths for XRPL, Metal L2, Stellar, XPR chains. See ADR-0701.';
