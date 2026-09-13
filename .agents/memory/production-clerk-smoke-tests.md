---
name: Production Clerk smoke tests
description: Constraints for exercising Clerk signup against a published Expo Go artifact.
---

Clerk testing tokens are instance-specific: a token minted with the development secret cannot bypass bot protection for the separately provisioned production instance.

Replit-managed Clerk web clients must be hosted on a Replit publication or a domain attached to it; do not export the managed client to Vercel or another external host.

**Why:** Replit swaps development keys for production keys at publish time, and its managed proxy validates the client origin. External Vercel origins fail Clerk origin validation even when traffic is forwarded to `/api/__clerk`. A local smoke runner targeting the published URL also receives `captcha_missing_token` when it uses a development testing token against production.

**How to apply:** Host managed-Clerk web bundles on the Replit publication and derive their proxy URL from the production domain. Run production signup smoke checks in a context that receives the production Clerk environment. For Expo Go-only publication, use native device automation because browser runners cannot open the `exps://` client link or inspect runtime traffic.