# 🔥 XRPL Testnet Validation Guide

**Objective:** Validate the complete XRPL integration (wallet verification + token rewards) on XRPL Testnet.

**Status:** Ready for execution
**Time Required:** 30-45 minutes
**Prerequisites:** Server running, database seeded

---

## Why This Matters

This validation tests:
1. **ADR-0601:** XRPL WebAuth Integration Pattern (signature-based wallet verification)
2. **Token Economy:** EXPLORER/REGEN/GUARDIAN token distribution
3. **Blockchain Integration:** Real transactions on XRPL Testnet
4. **End-to-End Flow:** Challenge → Sign → Verify → Reward

**This is the highest-risk component** and currently untested with live blockchain.

---

## Phase 1: Get Testnet Wallet & Credentials

### Step 1.1: Visit XRPL Testnet Faucet

1. Go to: **https://xrpl.org/xrp-testnet-faucet.html**
2. Click **"Generate Testnet Credentials"**
3. **SAVE** the following (you'll need them):
   - **Address** (starts with `r`, like `rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku`)
   - **Secret** (starts with `s`, like `sEdVHMRPifgyXquSKsh7R2271um6qcr`)
   - **Balance** (should show 1,000 XRP)

**Example Output:**
```
Generated new credentials:
Address: rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku
Secret: sEdVHMRPifgyXquSKsh7R2271um6qcr
Balance: 1,000 XRP
```

⚠️ **SECURITY NOTE:** These are testnet credentials (worthless). Never share mainnet secrets!

### Step 1.2: Update .env with Testnet Issuer

Add these lines to `platforms/brother-nature/core/.env`:

```env
# XRPL Testnet Configuration
XRPL_NETWORK=testnet
XRPL_SERVER=wss://s.altnet.rippletest.net:51233
XRPL_ISSUER_ADDRESS=rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku  # Your testnet address
XRPL_ISSUER_SECRET=sEdVHMRPifgyXquSKsh7R2271um6qcr      # Your testnet secret
```

### Step 1.3: Restart Server

The server must restart to load the new XRPL credentials:

```bash
# Stop server (Ctrl+C in terminal running npm run dev)
# Then restart:
npm run dev
```

**Verify in logs:**
```
[INFO] Brother Nature Platform running on http://0.0.0.0:3000
[INFO] Environment: development
```

---

## Phase 2: Get Authentication Token

You need a JWT token to call authenticated endpoints.

### Option A: Login as Existing User

```bash
# Login as steward (can trigger synthesis)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "steward@brothernature.org",
    "password": "steward123"
  }'
```

**Save the token from response:**
```json
{
  "token": "eyJhbGc...",  // <-- Copy this
  "user": { ... }
}
```

```bash
# Set as environment variable for easy reuse
export JWT_TOKEN="eyJhbGc..."
```

### Option B: Create New User

```bash
# Create account
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@xrpl.test",
    "username": "xrpl_tester",
    "password": "test123",
    "displayName": "XRPL Tester"
  }'

# Then login (same as Option A)
```

---

## Phase 3: Test Wallet Challenge/Verify Flow (ADR-0601)

### Step 3.1: Generate Challenge

```bash
curl -X POST http://localhost:3000/api/auth/wallet/challenge \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "xrplWalletAddress": "rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku"
  }' | jq .
```

**Expected Response:**
```json
{
  "nonce": "64-char-hex-string...",
  "message": "Brother Nature Wallet Verification\n\nPlease sign...",
  "expiresAt": "2025-11-09T16:00:00.000Z"
}
```

**Save these values:**
```bash
export NONCE="<nonce from response>"
export MESSAGE="<message from response>"
```

### Step 3.2: Sign the Challenge

Use the CLI signer script:

```bash
cd platforms/brother-nature/core

# Sign the message
node sign-message.js "sEdVHMRPifgyXquSKsh7R2271um6qcr" "$MESSAGE"
```

**Expected Output:**
```json
{
  "signature": "304402...",
  "publicKey": "ED...",
  "address": "rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku"
}
```

**Save the values:**
```bash
export SIGNATURE="<signature from output>"
export PUBLIC_KEY="<publicKey from output>"
```

### Step 3.3: Verify the Signature

```bash
curl -X POST http://localhost:3000/api/auth/wallet/verify \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"nonce\": \"$NONCE\",
    \"xrplWalletAddress\": \"rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku\",
    \"signature\": \"$SIGNATURE\",
    \"publicKey\": \"$PUBLIC_KEY\"
  }" | jq .
```

**Expected Success Response:**
```json
{
  "message": "Wallet verified and linked successfully",
  "user": {
    "id": "...",
    "email": "steward@brothernature.org",
    "xrplWalletAddress": "rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku"
  }
}
```

✅ **ADR-0601 VALIDATED** if you see this response!

---

## Phase 4: Test Token Reward System

### Step 4.1: Find a Post to Synthesize

Get a post ID from the seeded data:

```bash
curl http://localhost:3000/api/posts | jq '.posts[0].id'
```

**Example output:**
```
"cm3a1b2c3d4e5f6g7h8i9j0k"
```

```bash
export POST_ID="cm3a1b2c3d4e5f6g7h8i9j0k"
```

### Step 4.2: Trigger Synthesis (This Sends Token Reward)

```bash
curl -X POST http://localhost:3000/api/synthesis/trigger \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"threadRootId\": \"$POST_ID\",
    \"synthesisType\": \"thread\"
  }" | jq .
```

**Expected Response:**
```json
{
  "artifact": {
    "id": "...",
    "title": "Synthesis: ...",
    "summary": "...",
    "keyPoints": [...]
  },
  "metadata": {
    "postsAnalyzed": 1,
    "threadDepth": 0
  },
  "reward": {
    "txHash": "ABC123...",  // <-- XRPL Transaction Hash!
    "amount": "10",
    "tokenType": "EXPLORER",
    "recipient": "regenerative_farmer"
  }
}
```

### Step 4.3: Verify XRPL Transaction

**If reward succeeded:**

1. Copy the `txHash` from response
2. Go to: **https://testnet.xrpl.org/**
3. Paste the transaction hash in search
4. **Verify:**
   - Transaction status: "Validated"
   - Transaction type: "Payment"
   - Amount: "10 EXPLORER"
   - Destination: Your XRPL wallet address

**Example Transaction:**
```
Status: ✅ Validated
Type: Payment
From: rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku (Issuer)
To: rfEwzzYwKYRdio6JyC5nxSeKh3zaBhGEku (Author)
Amount: 10 EXPLORER
Ledger: 123456
Date: 2025-11-09 15:45:23 UTC
```

✅ **TOKEN ECONOMY VALIDATED** if transaction appears on testnet explorer!

---

## Troubleshooting

### "Wallet already linked to another user"

**Problem:** You're trying to link a wallet that's already linked.

**Solution:** Use a different testnet wallet or unlink the existing one:
1. Get new credentials from faucet
2. Use the new address in challenge request

### "Invalid signature"

**Problem:** Signature doesn't match the challenge.

**Solutions:**
1. **Check message matches exactly** - Copy the full message from challenge response
2. **Check secret is correct** - Ensure you're using the right testnet secret
3. **Check nonce not expired** - Challenges expire in 5 minutes
4. **Regenerate challenge** - Start from Step 3.1 again

### "Challenge not found"

**Problem:** Server restarted and database is ephemeral.

**Wait...** This shouldn't happen anymore! We migrated to PostgreSQL.

**If it happens:**
1. Check server is still running
2. Verify DATABASE_URL in .env is correct
3. Check challenge was generated less than 5 minutes ago

### "Reward failed: XRPL error"

**Problem:** Token distribution failed.

**Possible Causes:**
1. **XRPL_ISSUER_SECRET not set** - Check .env
2. **Testnet network issues** - Try again in a few minutes
3. **Wallet not activated** - Ensure faucet gave you 1,000 XRP
4. **Trust line issues** - First transaction to new wallet may fail

**Debug:**
```bash
# Check server logs for detailed error
# Look for lines like:
[ERROR] XRPL transaction failed: ...
```

---

## Expected Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Get testnet wallet | 2 min |
| 1 | Update .env & restart | 2 min |
| 2 | Login & get JWT | 1 min |
| 3.1 | Generate challenge | 30 sec |
| 3.2 | Sign message | 30 sec |
| 3.3 | Verify signature | 30 sec |
| 4.1 | Find post ID | 30 sec |
| 4.2 | Trigger synthesis | 1 min |
| 4.3 | Verify on explorer | 2 min |
| **Total** | **~10 minutes** | **(hands-on)** |

---

## Success Criteria

✅ **Complete Validation Requires:**

1. Challenge generated successfully
2. Message signed with XRPL wallet
3. Signature verified and wallet linked
4. Synthesis triggered
5. Token reward created in database
6. XRPL transaction visible on testnet explorer
7. Transaction shows "Validated" status

---

## What This Proves

**ADR-0601 (XRPL WebAuth):**
- ✅ Cryptographic challenge-response pattern works
- ✅ Signature verification without exposing private keys
- ✅ Wallet ownership proven
- ✅ Production-ready for mainnet

**Token Economy:**
- ✅ EXPLORER tokens distribute correctly
- ✅ XRPL integration functional
- ✅ Transaction finality on blockchain
- ✅ Ready to scale to REGEN/GUARDIAN tokens

**System Integration:**
- ✅ Database persistence works (challenges survive)
- ✅ JWT authentication works
- ✅ XRPL service layer works
- ✅ End-to-end flow complete

---

## After Validation

Once validated:

1. **Document Results:**
   - Screenshot of successful verification response
   - Screenshot of XRPL transaction on explorer
   - Transaction hash saved

2. **Create ADR-0601:**
   - Formalize the XRPL WebAuth pattern
   - Document security properties
   - Publish as reference for UCF ecosystem

3. **Plan Production Deployment:**
   - Switch to mainnet credentials
   - Set up monitoring for XRPL transactions
   - Implement token reserve management

4. **Next Features:**
   - REGEN/GUARDIAN token distribution
   - Trustline management
   - Token balance queries
   - Reward history UI

---

**Ready to validate!** Follow the phases sequentially and document each success. 🚀
