---
name: Vercel build configuration
description: How the Vite build is configured to output correctly for Vercel vs Replit
---

# Vercel Build Configuration

## Rule
`vite.config.ts` uses `process.env.VERCEL` to choose the output directory:
- When `VERCEL` is set (Vercel builds): output goes to `path.resolve(import.meta.dirname, "../../public")` = project root's `public/`
- Otherwise (Replit): output goes to `path.resolve(import.meta.dirname, "dist/public")` = `artifacts/duty-scheduler/dist/public/`

`vercel.json` sets `"outputDirectory": "public"` and the build command does NOT need any cp step.

**Why:** Vercel ignores custom `outputDirectory` values in `vercel.json` when `framework: null` is set and falls back to looking for `public/`. Attempts to cp the output after build failed because Vercel's CWD during build commands is unpredictable relative to the artifact directory. Having Vite write directly to the expected location is the most reliable approach.

**How to apply:** If the Vite build output location ever needs to change for Replit production, update only the non-VERCEL branch. If Vercel deployment breaks again with output directory errors, check that `process.env.VERCEL` is being set by Vercel's build environment (it is set automatically by Vercel).
