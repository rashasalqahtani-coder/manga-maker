---
name: API declaration rebuilds
description: Why standalone API typechecks force TypeScript declaration emission for workspace libraries.
---

Standalone API typechecks must force a build of referenced workspace libraries before checking the API leaf package.

**Why:** TypeScript's incremental build state can remain after generated `dist` declarations are deleted or become stale. A normal `tsc --build` may trust the surviving build metadata and skip declaration emission, leaving the API with TS6305 errors or outdated exports.

**How to apply:** Keep forced library declaration emission in the API pre-typecheck lifecycle. Validate changes from a clean state by removing a library's generated declarations and confirming the standalone API typecheck recreates them.