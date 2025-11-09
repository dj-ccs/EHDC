#!/usr/bin/env node
/**
 * xrpl_helper.js
 * One-shot XRPL Wallet Challenge Helper
 * MacOS Intel compatible
 * Usage: node xrpl_helper.js
 */

const { execSync } = require("child_process");
const fetch = require("node-fetch"); // npm i node-fetch@2
const fs = require("fs");
const keypairs = require("ripple-keypairs");
const { Wallet } = require("xrpl");

// -----------------------------
// CONFIG - edit your JWT + testnet wallet
// -----------------------------
const JWT_TOKEN_FRESH = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaHI4a2RsMDAwMDE2YWt2eXNpbDJvYXEiLCJlbWFpbCI6InN0ZXdhcmRAYnJvdGhlcm5hdHVyZS5vcmciLCJ1c2VybmFtZSI6InN0ZXdhcmQxIiwicm9sZSI6IlNURVdBUkQiLCJpYXQiOjE3NjI2NzQ3NTQsImV4cCI6MTc2MzI3OTU1NH0.SaYCQwfA34smf_YTieUMHX_snqoUARN11wpYPNsUKHY";
const TEST_ADDRESS = "r9txmYFfUfzgzfdMUdeZ1Y8etdWmxEayRf";
const TEST_SECRET = "sEdT91KZ5fvvLyxKzXAFYgHfNiVQ5hv";

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

  const { privateKey, publicKey } = keypairs.deriveKeypair(TEST_SECRET);
  const messageHex = Buffer.from(MESSAGE, "utf8").toString("hex");
  const signature = keypairs.sign(messageHex, privateKey);

  console.log("✅ Signature generated");
  console.log(`Address:    ${TEST_ADDRESS}`);
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
