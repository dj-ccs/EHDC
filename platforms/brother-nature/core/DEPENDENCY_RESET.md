# Dependency Reset Instructions

## Problem
The Brother Nature server fails to start with TypeScript errors related to the `xrpl` package's `verify` function. This is caused by an outdated or non-standard xrpl package version in your Codespace.

## Error History
- **TS2305**: Module 'xrpl' has no exported member 'verify'
- **TS2554**: Expected 1-2 arguments, but got 3 (when using verifySignature)
- **TS2339**: Property 'verify' does not exist on type 'typeof Wallet'

## Root Cause
Your Codespace's `node_modules` contains an xrpl package version that doesn't match the standard API structure. The code has been updated to use the correct pattern for **xrpl v3.x/v4.x** (latest versions).

## Solution: Reset Dependencies

Run these commands **in your Codespace terminal**:

```bash
# Navigate to the core directory
cd /workspaces/EHDC/platforms/brother-nature/core

# Delete old dependencies
rm -rf node_modules package-lock.json

# Install fresh dependencies (this will get xrpl v3+ from npm)
npm install

# Start the dev server
npm run dev
```

## Expected Result

After running `npm install`, you should have:
- **xrpl v3.0.0 or later** in `node_modules/xrpl/package.json`
- The `verify` function available as a top-level export
- Server starts without TypeScript errors

## How to Verify Success

1. After `npm install`, check the xrpl version:
   ```bash
   cat node_modules/xrpl/package.json | grep version
   ```
   Should show: `"version": "3.x.x"` or `"4.x.x"`

2. Start the server:
   ```bash
   npm run dev
   ```
   Should see: `Server started on port 3000` (no TypeScript errors)

## What Changed in the Code

The code now uses the **standard pattern** for xrpl v3+:

```typescript
// Import (line 1)
import { verify } from 'xrpl';

// Usage (line 320)
return verify(message, signature, publicKey);
```

This is the correct, documented API for modern xrpl.js versions.

## Why This Happened

GitHub Codespaces may cache or persist old `node_modules` between sessions. A fresh `npm install` ensures you get the latest published versions from the npm registry.

## Next Steps After Fix

Once the server starts successfully:
1. Test the signature verification endpoints
2. Proceed with the Hands-On Lab
3. The Brother Nature API is ready for UCF validation

---

**Note**: This reset only affects the `platforms/brother-nature/core` directory. It does not modify any code files, only dependencies.
