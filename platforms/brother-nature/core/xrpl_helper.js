#!/usr/bin/env node
/**
 * xrpl_helper.js
 * One-shot XRPL Wallet Challenge Helper
 * MacOS Intel compatible
 * Usage: node xrpl_helper.js
 *
 * SECURITY FIX: Removed ripple-keypairs dependency to eliminate CVSS 9.3
 * elliptic vulnerability. Now uses xrpl.js native Wallet methods.
 */

const { execSync } = require("child_process");
const fetch = require("node-fetch"); // npm i node-fetch@2
const fs = require("fs");
const { Wallet } = require("xrpl");
const secp256k1 = require("tiny-secp256k1");

// -----------------------------
// CONFIG - Read from environment variables (ADR-0002 compliant)
// -----------------------------
// SECURITY FIX: Externalized all secrets to environment variables
// Set these in your shell before running:
//   export TEST_JWT_TOKEN="your-jwt-token"
//   export TEST_XRPL_ADDRESS="your-xrpl-address"
//   export TEST_XRPL_SECRET="your-xrpl-secret"

const JWT_TOKEN_FRESH = process.env.TEST_JWT_TOKEN;
const TEST_ADDRESS = process.env.TEST_XRPL_ADDRESS;
const TEST_SECRET = process.env.TEST_XRPL_SECRET;

// Validate required environment variables
if (!JWT_TOKEN_FRESH || !TEST_ADDRESS || !TEST_SECRET) {
  console.error("❌ Missing required environment variables:");
  console.error("  - TEST_JWT_TOKEN");
  console.error("  - TEST_XRPL_ADDRESS");
  console.error("  - TEST_XRPL_SECRET");
  console.error("\nSet these environment variables before running this script.");
  console.error("Example:");
  console.error('  export TEST_JWT_TOKEN="eyJhbGci..."');
  console.error('  export TEST_XRPL_ADDRESS="rYourAddress..."');
  console.error('  export TEST_XRPL_SECRET="sYourSecret..."');
  process.exit(1);
}

// -----------------------------
// 1. REQUEST CHALLENGE
// -----------------------------
(async () => {
  console.log("--- 1. REQUESTING CHALLENGE ---");

  const challengeRes = await fetch("http://localhost:3000/api/auth/wallet/challenge", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${JWT_TOKEN_FRESH}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ xrplWalletAddress: TEST_ADDRESS })
  });

  if (!challengeRes.ok) {
    console.error("❌ Challenge generation failed");
    process.exit(1);
  }

  const challengeJson = await challengeRes.json();
  const { nonce: FRESH_NONCE, message: MESSAGE_RAW } = challengeJson;

  if (!FRESH_NONCE || !MESSAGE_RAW) {
    console.error("❌ Failed to extract nonce or message");
    process.exit(1);
  }

  // Clean message: remove trailing CR/LF
  const MESSAGE = MESSAGE_RAW.replace(/\r/g, "").trim();

  console.log(`✅ Challenge captured. Nonce: ${FRESH_NONCE}`);

  // -----------------------------
  // 2. SIGN MESSAGE
  // -----------------------------
  console.log("--- 2. SIGNING MESSAGE ---");

  // SECURITY FIX: Use xrpl.js native Wallet instead of ripple-keypairs
  const wallet = Wallet.fromSeed(TEST_SECRET);
  const publicKey = wallet.publicKey;
  const messageHex = Buffer.from(MESSAGE, "utf8").toString("hex");

  // Use tiny-secp256k1 for signing (eliminates ripple-keypairs/elliptic vulnerability)
  const messageHash = Buffer.from(require('crypto').createHash('sha512').update(Buffer.from(messageHex, 'hex')).digest().slice(0, 32));
  const privateKeyBytes = Buffer.from(wallet.privateKey, 'hex');
  const signatureBytes = secp256k1.sign(messageHash, privateKeyBytes);
  const signature = Buffer.from(signatureBytes).toString('hex').toUpperCase();

  console.log("✅ Signature generated");
  console.log(`Address:    ${wallet.address}`);
  console.log(`Public Key: ${publicKey}`);
  console.log(`Signature:  ${signature}`);

  // -----------------------------
  // 3. VERIFY SIGNATURE
  // -----------------------------
  console.log("--- 3. VERIFYING SIGNATURE ---");

  const verifyRes = await fetch("http://localhost:3000/api/auth/wallet/verify", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${JWT_TOKEN_FRESH}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nonce: FRESH_NONCE,
      xrplWalletAddress: TEST_ADDRESS,
      signature,
      publicKey
    })
  });

  const verifyJson = await verifyRes.json();
  console.log(verifyJson);
  console.log("--- DONE ---");
})();
