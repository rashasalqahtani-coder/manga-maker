# مانجا — قارئ المانجا العربي

تطبيق موبايل عربي كامل لقراءة المانجا، مبني على Expo SDK 54 ويدعم 4 مصادر مانجا.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router (file-based routing), React Compiler enabled
- Auth: Clerk via `@clerk/expo`
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app (main product)
  - `app/(tabs)/` — Tab screens: index (home), search, library, history, settings
  - `app/(auth)/` — Auth screens: sign-in, sign-up (Clerk)
  - `app/team/` — Translation team screens: index, create
  - `app/manga/[id].tsx` — MangaDex manga detail page
  - `app/reader/[chapterId].tsx` — MangaDex chapter reader
  - `app/starz/[slug].tsx` — Starz/linkmanga/dilar manga detail + chapter list
  - `app/starz/reader.tsx` — WebView reader for starz/linkmanga/dilar/olympus chapters
  - `context/` — React contexts: Library, Download, Theme, Team, ReaderSettings, Source
  - `context/SourceContext.tsx` — 4-source selector (starz/linkmanga/dilar/olympus), persisted via AsyncStorage
  - `lib/sources.ts` — UnifiedManga type + fetchHomeMangas/searchMangas/getChaptersUrl adapters
  - `lib/mangadex.ts` — MangaDex API client (source of truth for Manga/Chapter types)
  - `lib/mangastarz.ts` — Manga-starz API client
  - `constants/colors.ts` — Static dark theme fallback colors
  - `hooks/useColors.ts` — Merges ThemeContext + static colors into unified token palette
- `artifacts/api-server/` — Express API backend
  - `src/routes/mangastarz.ts` — manga-starz.net scraper (route prefix: /starz)
  - `src/routes/linkmanga.ts` — link-manga.net Madara scraper (route prefix: /linkmanga)
  - `src/routes/kenmanga.ts` — ar.kenmanga.com HTML scraper (route prefix: /kenmanga)
  - `src/routes/olympus.ts` — olympustaff.com HTML scraper (route prefix: /olympus)

## Architecture decisions

- **ThemeContext**: Uses "use no memo" directive to bypass React Compiler memoization. Persists via localStorage (web) and dynamic AsyncStorage import (native). Must NOT block the initial render.
- **useColors hook**: Calls `useColorScheme()` (for hook count stability with React Compiler) AND `useTheme()` to merge dynamic theme values into the static color structure.
- **Provider order in _layout.tsx**: ClerkProvider → ClerkLoaded → SafeAreaProvider → ThemeProvider → ErrorBoundary → QueryClientProvider → LibraryProvider → TeamProvider → ReaderSettingsProvider → DownloadProvider → SourceProvider → GestureHandlerRootView → KeyboardProvider.
- **Team feature**: Local-only (AsyncStorage), no backend sync. One team per user.
- **Reader settings**: Persisted via AsyncStorage, applied globally via ReaderSettingsContext.
- **Multi-source system**: SourceContext stores active source (starz/linkmanga/dilar/olympus) in AsyncStorage. `lib/sources.ts` provides unified adapters. Home/search screens use `fetchHomeMangas`/`searchMangas`. All 4 source home endpoints have 2-minute in-memory TTL cache for fast subsequent loads.
- **Navigation per source**: starz/linkmanga/dilar → `/starz/[slug]?src=X` (detail + chapter list); olympus → `/starz/reader` directly (JS-rendered chapters, open site URL in WebView).

## Product

- Browse and search Arabic-translated manga from 4 sources: manga-starz.net, link-manga.net, ar.kenmanga.com (AREA Manga), olympustaff.com
- Home screen: source picker banner (tap to change), featured carousel, trending row, recently updated row
- Library management with local bookmarks
- Chapter reader with RTL/LTR/vertical reading modes
- Download chapters for offline reading
- Full dark theme with 8 accent colors, 4 bg presets, 3 radius presets
- Clerk authentication (sign-in, sign-up with email verification)
- Translation team creation & management (add members, track manga being translated)
- Security settings (app lock toggle, privacy mode)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **React Compiler + Context**: The React Compiler can incorrectly memoize context consumers, causing white screens. Always add `"use no memo"` to context files and ensure `useColorScheme()` is called in `useColors.ts`.
- **White screen debug**: If screen is white but browser logs show app loading (3 standard warnings), the issue is likely a hook or context initialization problem. Revert `useColors.ts` to call `useColorScheme()` as first hook.
- **expo-router typed routes**: New route files require `as any` cast until Metro re-generates route types.
- **lib/download.ts**: Import from `expo-file-system/legacy` (not `expo-file-system`) — SDK 54 deprecated `getInfoAsync` and `makeDirectoryAsync` in the new API. The legacy import fixes the crash on native.
- **Do not run `pnpm dev` at workspace root** — use `restart_workflow` instead.
- **ComicK.io blocked**: ComicK's API redirects to comick.dev which is protected by Cloudflare and returns 403 for all server-side requests. `lib/comick.ts` is kept as a no-op stub so imports don't break. Do not attempt to re-integrate ComicK via server proxy.
- **Home screen "use no memo"**: `app/(tabs)/index.tsx` needs `"use no memo"` at both file and function level due to React Compiler memoizing async state updates incorrectly.
- **Reader "use no memo"**: `app/reader/[chapterId].tsx` needs `"use no memo"` at file and function level. Also wrap `getLocalPages()` call in try-catch (the outer try-catch only covers the network fetch). Use `useCallback` + `useRef` for `onViewableItemsChanged` and `viewabilityConfig` — FlatList requires stable references.
- **External chapters**: Many Arabic-translated chapters on MangaDex have `externalUrl` and `pages: 0` — they are hosted on external sites (e.g. Tappytoon). `at-home/server` returns `data: []` for these. `ChapterItem` detects them via `pages === 0 && externalUrl` and opens `Linking.openURL` directly instead of navigating to the reader. They display a "خارجي" badge. The `Chapter.attributes` type includes `externalUrl: string | null`.
- **FlatList viewability**: `onViewableItemsChanged` must be a stable reference (useCallback). `viewabilityConfig` must be a stable ref (useRef). Passing either inline causes FlatList to warn and behave incorrectly.
- **linkmanga title parsing**: Titles are extracted from anchor `title="..."` attributes (NOT img alt tags). The `slugTitleMap` approach ensures correct title-to-slug alignment.
- **kenmanga home parsing**: Uses sequential extraction — titles from `card-v-title`, slugs from `/manga/{slug}/` hrefs, covers from `i0.wp.com` CDN. Must zip arrays by index since card-v regex stops too early to contain all fields.
- **kenmanga search**: Uses `/search/{query}/` (not `/?s=`). Result cards use `update-card` class with `u-title` for title. Chapter links use `chapter-chip` class.
- **kenmanga chapters**: Chapter URLs encoded as `/{manga-slug}-الفصل-{num}/` (URL encoded). Chapter number extracted from last numeric segment of decoded URL.
- **olympus chapters**: `olympustaff.com` renders chapters via JavaScript — there is no server-side chapter list. Navigation for olympus manga opens the manga URL directly in the WebView reader.
- **API home cache**: All 4 `/home` endpoints (starz/linkmanga/kenmanga/olympus) have a 2-minute in-memory TTL cache. Cache is module-level (survives request cycles, cleared on server restart). First load ~1.5s, cached load ~5ms.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- MangaDex API types: `Manga`, `Chapter` in `artifacts/mobile/lib/mangadex.ts`
- Source API routes: `/api/starz/*`, `/api/linkmanga/*`, `/api/dilar/*`, `/api/olympus/*`
- UnifiedManga type and source adapters: `artifacts/mobile/lib/sources.ts`
