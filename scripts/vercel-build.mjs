import { execSync } from "child_process";
import { cpSync, mkdirSync, existsSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, ".."); // repo/workspace root (always correct)

// 1. Typecheck shared libs
execSync("pnpm -w run typecheck:libs", { stdio: "inherit", cwd: ROOT });

// 2. Vite build — output goes to artifacts/duty-scheduler/dist/public
execSync("pnpm --filter @workspace/duty-scheduler run build", {
  stdio: "inherit",
  cwd: ROOT,
  env: { ...process.env, BASE_PATH: "/" },
});

// 3. Copy to outputDirectory="public" relative to Vercel's CWD
const src = resolve(ROOT, "artifacts/duty-scheduler/dist/public");
const dst = resolve(process.cwd(), "public");

console.log(`\nCopying ${src}\n     → ${dst}`);
if (existsSync(dst)) rmSync(dst, { recursive: true });
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
console.log("✓ Build output ready");
