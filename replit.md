# مانجا — قارئ المانجا العربي

تطبيق موبايل عربي كامل لقراءة المانجا، مبني على Expo SDK 54 ويستخدم MangaDex API كمصدر للمحتوى.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
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
  - `app/manga/[id].tsx` — Manga detail page
  - `app/reader/[chapterId].tsx` — Chapter reader
  - `context/` — React contexts: Library, Download, Theme, Team, ReaderSettings
  - `lib/mangadex.ts` — MangaDex API client (source of truth for Manga/Chapter types)
  - `constants/colors.ts` — Static dark theme fallback colors
  - `hooks/useColors.ts` — Merges ThemeContext + static colors into unified token palette
- `artifacts/api-server/` — Express API backend

## Architecture decisions

- **ThemeContext**: Uses "use no memo" directive to bypass React Compiler memoization. Persists via localStorage (web) and dynamic AsyncStorage import (native). Must NOT block the initial render.
- **useColors hook**: Calls `useColorScheme()` (for hook count stability with React Compiler) AND `useTheme()` to merge dynamic theme values into the static color structure.
- **Provider order in _layout.tsx**: ClerkProvider → ClerkLoaded → SafeAreaProvider → ThemeProvider → ErrorBoundary → QueryClientProvider → LibraryProvider → TeamProvider → ReaderSettingsProvider → DownloadProvider → GestureHandlerRootView → KeyboardProvider.
- **Team feature**: Local-only (AsyncStorage), no backend sync. One team per user.
- **Reader settings**: Persisted via AsyncStorage, applied globally via ReaderSettingsContext.

## Product

- Browse and search Arabic-translated manga via MangaDex API
- Home screen sections: أفضل تقييماً (featured banner), الأكثر شعبية, محدّثة مؤخراً, مانهوا كورية 🇰🇷, مانهوا صينية 🇨🇳, أحدث الإضافات عربياً
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
- **lib/download.ts**: Pre-existing TS error on `documentDirectory` (unrelated to main features, does not affect runtime).
- **Do not run `pnpm dev` at workspace root** — use `restart_workflow` instead.
- **ComicK.io blocked**: ComicK's API redirects to comick.dev which is protected by Cloudflare and returns 403 for all server-side requests. `lib/comick.ts` is kept as a no-op stub so imports don't break. Do not attempt to re-integrate ComicK via server proxy.
- **Home screen "use no memo"**: `app/(tabs)/index.tsx` needs `"use no memo"` at both file and function level due to React Compiler memoizing async state updates incorrectly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- MangaDex API types: `Manga`, `Chapter` in `artifacts/mobile/lib/mangadex.ts`
