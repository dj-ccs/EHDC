// signer.js - XRPL Message Signer (SECURITY HARDENED VERSION)
//
// SECURITY FIX: Removed ripple-keypairs dependency to eliminate CVSS 9.3
// elliptic vulnerability. Now uses xrpl.js native Wallet methods.

// Import the necessary utilities
const { Wallet } = require('xrpl');
const secp256k1 = require('tiny-secp256k1');
const crypto = require('crypto');

// !!! REPLACE THESE PLACEHOLDERS !!!
const TESTNET_SECRET = 'sEdVHMRPifgyXquSKsh7R2271um6qcr'; // Your Secret from Phase 1
const MESSAGE_FROM_SERVER = 'Brother Nature Wallet Verification\n\nPlease sign this message to verify ownership of your XRPL wallet.\n\nWallet Address: rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku\nVerification Code: 711e9eca93c7338e036cf6f80315a01dfa3822aa7265b9f8b02dc2a190d5b891\nTimestamp: 2025-11-08T00:58:18.632Z\n\nThis request will expire in 5 minutes.'; // The message from Phase 3
// !!! ----------------------------- !!!

function signChallenge(secret, message) {
    // 1. Create wallet from secret using xrpl.js native Wallet
    // SECURITY FIX: Use Wallet.fromSeed() instead of ripple-keypairs
    const wallet = Wallet.fromSeed(secret);
    const publicKey = wallet.publicKey;

    // 2. Convert message to hex
    const messageHex = Buffer.from(message, 'utf8').toString('hex');

    // 3. Sign the message using tiny-secp256k1 (eliminates elliptic vulnerability)
    const messageHash = Buffer.from(crypto.createHash('sha512').update(Buffer.from(messageHex, 'hex')).digest().slice(0, 32));
    const privateKeyBytes = Buffer.from(wallet.privateKey, 'hex');
    const signatureBytes = secp256k1.sign(messageHash, privateKeyBytes);
    const signature = Buffer.from(signatureBytes).toString('hex').toUpperCase();

    console.log("--- SIGNING RESULT ---");
    console.log(`Address:    ${wallet.address}`);
    console.log(`Public Key: ${publicKey}`);
    console.log(`Signature:  ${signature}`);
    console.log("----------------------");

    return { signature, publicKey };
}

signChallenge(TESTNET_SECRET, MESSAGE_FROM_SERVER);