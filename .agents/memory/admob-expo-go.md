---
name: AdMob in Expo Go
description: How to preserve Expo Go previews when an app also ships native Google Mobile Ads.
---

Native Google Mobile Ads is unavailable in Expo Go. Any runtime import at startup can make the preview fail even when ads are intended only for installable builds.

**Why:** AdMob requires custom native code and a rebuilt client, while Expo Go contains no matching native module.

**How to apply:** Gate ads by platform and Expo ownership, then dynamically import the ads SDK only in a compatible installable build. Keep development on Google test ad IDs and verify real ads on a native device build.