// signer.js - THE DEFINITIVE FINAL VERSION

// Import the necessary utilities
const { Wallet } = require('xrpl');
const keypairs = require('ripple-keypairs'); 
const { deriveKeypair } = require('ripple-keypairs'); // We will use this one!

// !!! REPLACE THESE PLACEHOLDERS !!!
const TESTNET_SECRET = 'sEdVHMRPifgyXquSKsh7R2271um6qcr'; // Your Secret from Phase 1
const MESSAGE_FROM_SERVER = 'Brother Nature Wallet Verification\n\nPlease sign this message to verify ownership of your XRPL wallet.\n\nWallet Address: rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku\nVerification Code: 711e9eca93c7338e036cf6f80315a01dfa3822aa7265b9f8b02dc2a190d5b891\nTimestamp: 2025-11-08T00:58:18.632Z\n\nThis request will expire in 5 minutes.'; // The message from Phase 3
// !!! ----------------------------- !!!

function signChallenge(secret, message) {
    // 1. Convert the human-readable secret (sEd...) into the private key (hex format)
    // deriveKeypair handles the complex sEd... to hex conversion
    const { publicKey, privateKey } = deriveKeypair(secret); 
    const wallet = Wallet.fromSecret(secret); // Used only to confirm address/public key integrity
    
    // 2. Hash the message (XRPL requires the message to be hashed before signing)
    // The keypairs utility expects a hex-encoded message or it performs its own hashing.
    const messageHex = Buffer.from(message, 'utf8').toString('hex');
    
    // 3. Use the correct utility function for signing raw data with the raw private key
    const signature = keypairs.sign(messageHex, privateKey); // <-- NOW USING raw privateKey

    console.log("--- SIGNING RESULT ---");
    console.log(`Address:    ${wallet.classicAddress}`);
    console.log(`Public Key: ${publicKey}`); // Public key from derivation
    console.log(`Signature:  ${signature}`);
    console.log("----------------------");

    return { signature, publicKey };
}

signChallenge(TESTNET_SECRET, MESSAGE_FROM_SERVER);