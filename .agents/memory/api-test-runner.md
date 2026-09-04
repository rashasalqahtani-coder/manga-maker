---
name: API test runner
description: How to run TypeScript integration tests in the API package without adding a separate runtime dependency.
---

Bundle API TypeScript test entries to CommonJS with the package's existing esbuild dependency, then execute the bundle with Node's built-in test runner.

**Why:** The workspace catalog mentions tsx but does not guarantee that its binary is installed. ESM test bundles also fail when bundled CommonJS dependencies such as Express use dynamic require.

**How to apply:** For API tests, keep the test script self-contained with esbuild `platform=node` and `format=cjs`, place generated output in the ignored `.test` directory, and run it with `node --test`.