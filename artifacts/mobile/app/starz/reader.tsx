"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { addToHistory } from "@/app/(tabs)/history";
import { useColors } from "@/hooks/useColors";
import { getLocalPages } from "@/lib/download";

function safeDecode(str?: string): string {
  if (!str) return "";
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// Injected into the WebView to strip ads/nav and focus on manga images
const INJECTED_JS = `
(function() {
  'use strict';

  function cleanup() {
    const selectors = [
      'header', '.site-header', '#header', '.navbar', '.nav-bar',
      'footer', '.site-footer', '#footer',
      '.ads', '.ad', '[class*="advertisement"]', '[id*="advertisement"]',
      '.wp-manga-nav', '.manga-info-top', '.manga-breadcrumb',
      '.c-breadcrumb', '.nav-links',
      '.reading-content-sidebar', '.sidebar',
      '#sidebar', '.entry-header', '.c-entry-content > *:not(.reading-content)',
      '.chapter-warning', '.login-popup-wrapper',
      '.cookie-notice', '.notice-cookie',
      '#wpadminbar', '.wp-admin-bar',
      '.top-bar', '.top-header',
      '.chapter-nav', '.chapter-navigation', '.prev-next-wrap',
      '.reading-nav', '.reading-navigation',
      'script[src*="ad"]', 'iframe:not([src*="manga"])',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
    });

    // Force dark bg + full width images
    document.body.style.setProperty('background', '#0a0a0a', 'important');
    document.body.style.setProperty('margin', '0', 'important');
    document.body.style.setProperty('padding', '0', 'important');

    const readingContent = document.querySelector('.reading-content');
    if (readingContent) {
      readingContent.style.setProperty('max-width', '100%', 'important');
      readingContent.style.setProperty('padding', '0', 'important');
      readingContent.style.setProperty('margin', '0', 'important');
    }

    document.querySelectorAll('.page-break img, .reading-content img').forEach(img => {
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('margin', '0 auto', 'important');
    });

    document.querySelectorAll('.page-break').forEach(el => {
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('padding', '0', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('text-align', 'center', 'important');
    });
  }

  cleanup();

  // Re-run after DOM mutations (lazy-loaded images)
  const observer = new MutationObserver(() => cleanup());
  observer.observe(document.body, { childList: true, subtree: true });

  // Also run on scroll (some themes inject ads on scroll)
  window.addEventListener('scroll', cleanup, { passive: true });

  true;
})();
`;

const INJECTED_CSS = `
  header, .site-header, #header, footer, .site-footer, #footer,
  .ads, .ad, .wp-manga-nav, .reading-nav, .chapter-navigation,
  .nav-links, .prev-next-wrap, .sidebar, #sidebar,
  .manga-info-top, .manga-breadcrumb, .c-breadcrumb,
  .entry-header, #wpadminbar, .top-bar, .top-header,
  .chapter-warning, .login-popup-wrapper, .cookie-notice {
    display: none !important;
  }
  body {
    background: #0a0a0a !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .reading-content {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 auto !important;
  }
  .page-break {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    text-align: center !important;
  }
  .page-break img, .reading-content img {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
    margin: 0 auto !important;
  }
`;

export default function StarzWebViewReader() {
  "use no memo";
  const params = useLocalSearchParams<{
    url: string;
    title?: string;
    chapterNum?: string;
    slug?: string;
    latestChapter?: string;
    prevUrl?: string;
    nextUrl?: string;
    src?: string;
  }>();

  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [localPages, setLocalPages] = useState<string[] | null>(null);

  const url = params.url ? safeDecode(params.url) : "";
  const title = params.title ? safeDecode(params.title) : "قارئ المانجا";
  const chapterNum = params.chapterNum ? safeDecode(params.chapterNum) : "";
  const slug = params.slug ? safeDecode(params.slug) : "";
  const src = params.src ?? "";
  const coverUrl = params.coverUrl ? safeDecode(params.coverUrl) : null;
  const latestNum = params.latestChapter ? parseInt(params.latestChapter, 10) : 0;
  const currentNum = chapterNum ? parseInt(chapterNum, 10) : 0;

  // Add to history when reading chapter
  useEffect(() => {
    if (!src && !slug && !url) return;
    const entryChapterId = src && slug && chapterNum ? `${src}__${slug}__${chapterNum}` : (url || slug);
    const entryMangaId = slug || url;
    const entryTitle = title || slug || "مانجا";

    addToHistory({
      mangaId: entryMangaId,
      mangaTitle: entryTitle,
      coverUrl: coverUrl || null,
      chapterId: entryChapterId,
      chapterNum: chapterNum || null,
      readAt: Date.now(),
    });
  }, [src, slug, chapterNum, url, title, coverUrl]);

  // Check for offline-downloaded pages
  useEffect(() => {
    if (!src || !slug || !chapterNum) return;
    const chapterId = `${src}__${slug}__${chapterNum}`;
    getLocalPages(chapterId).then((pages) => {
      if (pages.length > 0) {
        setLocalPages(pages);
        setLoading(false);
      }
    });
  }, [src, slug, chapterNum]);

  const prevUrl = currentNum > 1
    ? `https://manga-starz.net/manga/${slug}/${currentNum - 1}/`
    : undefined;
  const nextUrl = latestNum > 0 && currentNum < latestNum
    ? `https://manga-starz.net/manga/${slug}/${currentNum + 1}/`
    : undefined;

  const goToChapter = (chUrl: string, num: number) => {
    Haptics.selectionAsync();
    router.replace({
      pathname: "/starz/reader" as any,
      params: {
        url: encodeURIComponent(chUrl),
        title: encodeURIComponent(title),
        chapterNum: encodeURIComponent(String(num)),
        slug: encodeURIComponent(slug),
        latestChapter: encodeURIComponent(String(latestNum)),
        src,
      },
    });
  };

  if (!url) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>رابط غير صالح</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#0a0a0a" }]}>
      {/* ── TOP BAR ── */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 6, backgroundColor: "rgba(0,0,0,0.92)" },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            if (!localPages && canGoBack && webviewRef.current) {
              webviewRef.current.goBack();
            } else {
              router.back();
            }
          }}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.mangaTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.chapterSubRow}>
            {chapterNum ? (
              <Text style={styles.chapterSub}>فصل {chapterNum}</Text>
            ) : null}
            {localPages && (
              <View style={styles.offlinePill}>
                <Feather name="wifi-off" size={9} color={colors.primary} />
                <Text style={[styles.offlinePillText, { color: colors.primary }]}>
                  أوفلاين
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.navBtns}>
          <Pressable
            onPress={() => prevUrl && goToChapter(prevUrl, currentNum - 1)}
            disabled={!prevUrl}
            hitSlop={8}
            style={[styles.navBtn, !prevUrl && { opacity: 0.3 }]}
          >
            <Feather name="chevron-right" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => nextUrl && goToChapter(nextUrl, currentNum + 1)}
            disabled={!nextUrl}
            hitSlop={8}
            style={[styles.navBtn, !nextUrl && { opacity: 0.3 }]}
          >
            <Feather name="chevron-left" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── OFFLINE READER (downloaded pages) ── */}
      {localPages ? (
        <FlatList
          data={localPages}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={styles.localPage}
              contentFit="contain"
            />
          )}
          showsVerticalScrollIndicator={false}
          style={styles.localReader}
        />
      ) : error ? (
        /* ── WEBVIEW ERROR ── */
        <View style={styles.errorContainer}>
          <Feather name="wifi-off" size={48} color="#555" />
          <Text style={styles.errorText}>تعذّر تحميل الفصل</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setError(false);
              setLoading(true);
              webviewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        /* ── WEBVIEW ── */
        <WebView
          ref={webviewRef}
          source={{ uri: url }}
          style={styles.webview}
          injectedJavaScript={INJECTED_JS}
          injectedJavaScriptBeforeContentLoaded={`
            const s = document.createElement('style');
            s.textContent = \`${INJECTED_CSS}\`;
            document.head.appendChild(s);
            true;
          `}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          mediaPlaybackRequiresUserAction
          allowsInlineMediaPlayback={false}
          userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        />
      )}

      {/* Loading overlay */}
      {loading && !error && !localPages && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>جارٍ تحميل الفصل...</Text>
        </View>
      )}

      {/* ── BOTTOM NAV ── */}
      {currentNum > 0 && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 4,
              backgroundColor: "rgba(0,0,0,0.88)",
              borderTopColor: "rgba(255,255,255,0.08)",
            },
          ]}
        >
          <Pressable
            onPress={() => prevUrl && goToChapter(prevUrl, currentNum - 1)}
            disabled={!prevUrl}
            style={[styles.bottomBtn, !prevUrl && { opacity: 0.3 }]}
          >
            <Feather name="chevron-right" size={18} color="#fff" />
            <Text style={styles.bottomBtnText}>الفصل السابق</Text>
          </Pressable>

          <View style={styles.chapterPill}>
            <Text style={styles.chapterPillText}>فصل {chapterNum}</Text>
          </View>

          <Pressable
            onPress={() => nextUrl && goToChapter(nextUrl, currentNum + 1)}
            disabled={!nextUrl}
            style={[styles.bottomBtn, !nextUrl && { opacity: 0.3 }]}
          >
            <Text style={styles.bottomBtnText}>الفصل التالي</Text>
            <Feather name="chevron-left" size={18} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    zIndex: 10,
  },
  backBtn: { padding: 4 },
  titleBlock: { flex: 1, gap: 2 },
  mangaTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  chapterSubRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterSub: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  offlinePillText: { fontSize: 9, fontWeight: "700" },
  navBtns: { flexDirection: "row", gap: 4 },
  navBtn: { padding: 6 },
  webview: { flex: 1, backgroundColor: "#0a0a0a" },
  localReader: { flex: 1, backgroundColor: "#0a0a0a" },
  localPage: { width: "100%", minHeight: 300 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 5,
  },
  loadingText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#0a0a0a",
  },
  errorText: { color: "rgba(255,255,255,0.7)", fontSize: 15 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "700" },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
  },
  bottomBtnText: { color: "#fff", fontSize: 13 },
  chapterPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chapterPillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
