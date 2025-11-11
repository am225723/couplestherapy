# Vercel Deployment Error Fix

## Problem Diagnosed

Your production deployment on Vercel was failing with the error:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/routes.ts' 
imported from /var/task/api/index.js
```

## Root Cause

The codebase was importing TypeScript files with `.ts` extensions:
- `import { registerRoutes } from "../server/routes.ts"` ❌
- `import { type User } from "../shared/schema.ts"` ❌

This works in development with `tsx` but fails in Vercel production because:
1. Vercel compiles TypeScript → JavaScript (`.ts` → `.js`)
2. The compiled code still references `.ts` files that don't exist in production
3. Node.js can't find the module

## Fixes Applied

### ✅ 1. Fixed api/index.ts
```typescript
// Before:
import { registerRoutes } from "../server/routes.ts";

// After:
import { registerRoutes } from "../server/routes";
```

### ✅ 2. Fixed server/storage.ts
```typescript
// Before:
import { type User, type InsertUser } from "../shared/schema.ts";

// After:
import { type User, type InsertUser } from "../shared/schema";
```

### ✅ 3. Fixed server/routes.ts
```typescript
// Before:
import type { TherapistAnalytics, CoupleAnalytics, AIInsight, SessionPrepResult, InsertVoiceMemo, VoiceMemo } from "../shared/schema.ts";
import { insertVoiceMemoSchema, insertCalendarEventSchema } from "../shared/schema.ts";

// After:
import type { TherapistAnalytics, CoupleAnalytics, AIInsight, SessionPrepResult, InsertVoiceMemo, VoiceMemo } from "../shared/schema";
import { insertVoiceMemoSchema, insertCalendarEventSchema } from "../shared/schema";
```

## Why This Works

TypeScript and Node.js module resolution automatically adds the correct extension:
- **Development**: `tsx` resolves to `.ts` files
- **Production**: Compiled JavaScript resolves to `.js` files
- **Best Practice**: Never include file extensions for relative imports

## Next Steps

1. **Test locally**: The app should still work in development
2. **Commit changes**:
   ```bash
   git add -A
   git commit -m "Fix: Remove .ts extensions from imports for Vercel deployment"
   git push
   ```

3. **Redeploy to Vercel**: 
   - Either push to your connected Git branch
   - Or run `vercel --prod` from the command line

4. **Verify**: After deployment completes, check your production logs:
   - You should no longer see "Cannot find module" errors
   - API endpoints should return 200 instead of 500

## Expected Result

✅ All API endpoints will work correctly
✅ Voice memos endpoint will load successfully
✅ No more module not found errors in production logs

## Technical Context

Your `tsconfig.json` has:
```json
{
  "allowImportingTsExtensions": true
}
```

This allows `.ts` extensions in **development only**. For production compatibility, we remove extensions and let the module resolver handle it automatically.
