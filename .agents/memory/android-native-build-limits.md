---
name: Android native build limits
description: Environment constraint encountered when validating generated Expo Android projects locally.
---

Local Android Gradle builds may require a project-local Android SDK because the standard Replit environment does not include one.

**Why:** Installing the platform, build tools, NDK, and Gradle transforms together exceeded the workspace disk quota; earlier attempts also exposed a JVM SIGBUS while Gradle populated its transform cache.

**How to apply:** Use Expo prebuild plus config/manifest checks for cheap native-link validation here, and reserve APK assembly and physical-device ad verification for an Android build environment with an SDK and sufficient disk quota.