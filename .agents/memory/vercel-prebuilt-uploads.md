---
name: Vercel prebuilt uploads
description: How to deploy an already-built static bundle through the Vercel REST API when the project has inherited monorepo settings.
---

For a non-Git Vercel deployment that uploads a prebuilt static bundle, prefix every uploaded path with the project's configured root directory. Set explicit successful build and install commands for the deployment instead of passing `null`. Keep inline deployment payloads below Vercel's 10 MB request limit; base64 increases the raw bundle size by roughly one third, so prune assets that the web runtime never loads.

**Why:** Vercel rejects files outside the configured root directory, and `null` does not clear inherited project commands. It can therefore rerun a build against a bundle that contains no source manifest. Expo Web may also emit every font exposed by a package barrel even when the app only registers a small subset, causing an otherwise valid inline upload to exceed the API limit.

**How to apply:** Use the project's existing root directory in both uploaded file paths and deployment settings, point the output directory at the uploaded static files, and override inherited build/install commands explicitly. Before inline upload, account for base64 overhead and remove only font assets that are not registered or loaded by the web app.