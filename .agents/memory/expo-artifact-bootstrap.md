---
name: Expo artifact bootstrap when directory pre-exists
description: How to register an Expo artifact when artifacts/<slug>/ already exists and createArtifact() fails.
---

When `createArtifact()` fails with "already exists", the directory was pre-created by a prior session.

**Why:** The createArtifact callback requires a fresh slug — it won't reuse a pre-existing directory.

**How to apply:**
1. Do NOT delete the directory (your code is in it).
2. Manually create `.replit-artifact/artifact.toml` with the correct TOML (kind, previewPath, services, etc.). Look at a sibling artifact.toml for the format.
3. Copy the file to itself (cp to a .edit.toml sibling), then call `verifyAndReplaceArtifactToml({ tempFilePath: "..edit.toml", artifactTomlPath: "..artifact.toml" })` — this registers it in the system.
4. Run `pnpm install --filter @workspace/<slug>` to link workspace deps.
5. Use `restart_workflow` with the workflow name `artifacts/<slug>: expo`.

For Expo artifacts the artifact.toml format is:
```toml
kind = "mobile"
previewPath = "/mobile"
title = "..."
version = "1.0.0"
id = "artifacts/<slug>"
router = "path"

[[integratedSkills]]
name = "expo"
version = "1.0.0"

[[services]]
name = "expo"
paths = [ "/mobile" ]
localPort = <port>

[services.development]
run = "pnpm --filter @workspace/<slug> run dev"

[services.production]
build = [ "pnpm", "--filter", "@workspace/<slug>", "run", "build" ]
run = "pnpm --filter @workspace/<slug> run serve"

[services.env]
PORT = "<port>"
```
