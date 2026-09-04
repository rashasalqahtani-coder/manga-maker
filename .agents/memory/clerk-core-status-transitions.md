---
name: Clerk Core status transitions
description: How custom Clerk Core authentication flows must react to asynchronous status changes.
---

Custom Clerk Core flows must drive verification and session finalization from observed `signIn.status` and `signUp.status` changes, rather than checking status immediately after awaiting a password or verification method.

**Why:** The future-resource hooks may publish the new status on the next React render. Immediate checks can miss `needs_second_factor` or `complete`, leaving the form idle with no error even though Clerk accepted the step.

**How to apply:** In custom Expo auth screens, use guarded effects for status-dependent transitions, support both second-factor and client-trust verification states, and prevent duplicate sends/finalization with refs.