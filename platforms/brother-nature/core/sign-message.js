#!/usr/bin/env node
/**
 * signer.js - XRPL Message Signer (CLI Version)
 *
 * Usage: node signer.js <SECRET> <MESSAGE>
 *
 * Example:
 *   node signer.js "sEdV..." "Brother Nature Wallet Verification..."
 *
 * Returns JSON: { signature, publicKey, address }
 */

const { Wallet } = require('xrpl');
const keypairs = require('ripple-keypairs');
const { deriveKeypair } = require('ripple-keypairs');

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
        // 1. Derive keypair from secret
        const { publicKey, privateKey } = deriveKeypair(secret);
        const wallet = Wallet.fromSecret(secret);

        // 2. Convert message to hex
        const messageHex = Buffer.from(message, 'utf8').toString('hex');

        // 3. Sign the message
        const signature = keypairs.sign(messageHex, privateKey);

        // 4. Return JSON for easy parsing
        const result = {
            signature,
            publicKey,
            address: wallet.classicAddress
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
