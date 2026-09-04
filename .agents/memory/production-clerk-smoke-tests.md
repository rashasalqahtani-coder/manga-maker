---
name: Production Clerk smoke tests
description: Constraints for exercising Clerk signup against a published Expo Go artifact.
---

Clerk testing tokens are instance-specific: a token minted with the development secret cannot bypass bot protection for the separately provisioned production instance.

**Why:** Replit-managed Clerk swaps development keys for production keys at publish time. A local smoke runner targeting the published URL otherwise receives `captcha_missing_token` even when it supplied a valid development testing token.

**How to apply:** Run production signup smoke checks in a context that receives the production Clerk environment. For an Expo Go-only publication, use native device automation; browser runners cannot open the `exps://` client link or inspect its runtime network traffic.