#!/usr/bin/env node
/**
 * sign-message.js - XRPL Message Signer (CLI Version)
 *
 * Usage: node sign-message.js <SECRET> <MESSAGE>
 *
 * Example:
 *   node sign-message.js "sEdV..." "Brother Nature Wallet Verification..."
 *
 * Returns JSON: { signature, publicKey, address }
 *
 * SECURITY FIX: Removed ripple-keypairs dependency to eliminate CVSS 9.3
 * elliptic vulnerability. Now uses xrpl.js native Wallet methods.
 */

const { Wallet } = require('xrpl');
const secp256k1 = require('tiny-secp256k1');
// SonarCloud Fix (S7772): Explicitly use the 'node:' protocol for built-in modules
const crypto = require('node:crypto');

// Get arguments from command line
const SECRET = process.argv[2];
const MESSAGE = process.argv[3];

if (!SECRET || !MESSAGE) {
    console.error('ERROR: Missing required arguments');
    console.error('Usage: node signer.js <SECRET> <MESSAGE>');
    process.exit(1);
}

function signChallenge(secret, message) {
    try {
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

        // 4. Return JSON for easy parsing
        const result = {
            signature,
            publicKey,
            address: wallet.address
        };

        // Output as JSON for script consumption
        console.log(JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error('ERROR: Signing failed');
        console.error(error.message);
        process.exit(1);
    }
}

signChallenge(SECRET, MESSAGE);
