"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { type StarzChapter } from "@/lib/mangastarz";
import { recordRorymMangaRead } from "@/lib/sources";

const API_BASE =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`
    : "/api";

type SrcParam = "linkmanga" | "kenmanga" | "asq" | "rorym";
type DownloadableChapter = StarzChapter & { pages?: string[] };

// JS injected into hidden WebView to extract chapter image URLs
const EXTRACT_IMAGES_JS = `
(function() {
  function extract() {
    try {
      var html = document.documentElement.innerHTML;
      var m = html.match(/ts_reader\\.run\\((\\{[\\s\\S]*?\\})\\)/);
      if (m) {
        var d = JSON.parse(m[1]);
        var imgs = d && d.sources && d.sources[0] && d.sources[0].images ? d.sources[0].images : [];
        if (imgs.length > 0) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'images',urls:imgs}));
          return;
        }
      }
    } catch(e) {}

    var readImgs = [];
    document.querySelectorAll('.reading-content img, .page-break img').forEach(function(img) {
      var src = img.getAttribute('data-src') || img.getAttribute('src') || '';
      if (src.startsWith('http')) readImgs.push(src);
    });
    if (readImgs.length > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'images',urls:readImgs}));
      return;
    }

    var upImgs = [];
    document.querySelectorAll('img').forEach(function(img) {
      var src = img.src || '';
      if (src.includes('/uploads/') && !src.includes('TeamX') && !src.includes('logo')) upImgs.push(src);
    });
    if (upImgs.length > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'images',urls:upImgs}));
      return;
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:'no images found'}));
  }
  setTimeout(extract, 3000);
  true;
})();
`;

function makeChapterId(src: SrcParam, slug: string, chapterNum: string): string {
  return `${src}__${slug}__${chapterNum}`;
}

function getChapterFetchApi(src: SrcParam, slug: string, latestChapter?: string): string {
  if (src === "linkmanga") {
    const idPath = `${API_BASE}/linkmanga/manga/${encodeURIComponent(slug)}/chapters`;
    return latestChapter ? `${idPath}?latest=${encodeURIComponent(latestChapter)}` : idPath;
  }
  if (src === "kenmanga") return `${API_BASE}/kenmanga/manga/${encodeURIComponent(slug)}/chapters`;
  if (src === "rorym") return `${API_BASE}/rorym/manga/${encodeURIComponent(slug)}/chapters`;
  const idPath = `${API_BASE}/asq/manga/${encodeURIComponent(slug)}/chapters`;
  return latestChapter ? `${idPath}?latest=${encodeURIComponent(latestChapter)}` : idPath;
}

function buildMangaUrl(src: SrcParam, slug: string): string {
  if (src === "linkmanga") return `https://link-manga.net/manga/${slug}/`;
  if (src === "kenmanga") return `https://ar.kenmanga.com/manga/${slug}/`;
  if (src === "rorym") return "";
  return `https://3asq.org/manga/${slug}/`;
}

function buildChapterUrl(src: SrcParam, slug: string, chapterNum: string): string {
  if (src === "linkmanga") return `https://link-manga.net/manga/${slug}/${chapterNum}/`;
  if (src === "kenmanga") return `https://ar.kenmanga.com/${slug}-الفصل-${chapterNum}/`;
  if (src === "rorym") return "";
  return `https://3asq.org/manga/${slug}/${chapterNum}/`;
}

function getSourceLabel(src: SrcParam): string {
  if (src === "linkmanga") return "لينك مانجا";
  if (src === "kenmanga") return "أريا مانجا";
  if (src === "rorym") return "روري م";
  return "مانجا العاشق";
}

interface ScrapeJob {
  chapter: DownloadableChapter;
  url: string;
  chapterId: string;
}

export default function StarzMangaDetailScreen() {
  "use no memo";
  const params = useLocalSearchParams<{
    slug: string;
    title?: string;
    coverUrl?: string;
    rating?: string;
    genres?: string;
    latestChapter?: string;
    src?: string;
  }>();
  const slug = params.slug ?? "";
  const src: SrcParam = (params.src as SrcParam) ?? "linkmanga";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startSourceDownload, cancelDownload, downloads } = useDownloads();
  const title = params.title
    ? decodeURIComponent(params.title)
    : slug.replace(/-/g, " ");
  const coverUrl = params.coverUrl ? decodeURIComponent(params.coverUrl) : "";

  const [chapters, setChapters] = useState<DownloadableChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);

  // ── Hidden WebView download scraping ────────────────────────────────────────
  const [scrapeQueue, setScrapeQueue] = useState<ScrapeJob[]>([]);
  const [activeScrape, setActiveScrape] = useState<ScrapeJob | null>(null);
  const scrapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance queue when activeScrape finishes
  useEffect(() => {
    if (!activeScrape && scrapeQueue.length > 0) {
      const [next, ...rest] = scrapeQueue;
      setActiveScrape(next!);
      setScrapeQueue(rest);
    }
  }, [activeScrape, scrapeQueue]);

  // Set scrape timeout
  useEffect(() => {
    if (activeScrape) {
      scrapeTimeoutRef.current = setTimeout(() => {
        setActiveScrape(null);
      }, 15_000);
      return () => {
        if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current);
      };
    }
    return undefined;
  }, [activeScrape]);

  const handleExtractedImages = useCallback(
    (data: string) => {
      if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current);
      try {
        const parsed = JSON.parse(data) as { type: string; urls?: string[] };
        if (parsed.type === "images" && parsed.urls && parsed.urls.length > 0 && activeScrape) {
          startSourceDownload(activeScrape.chapterId, parsed.urls, {
            mangaTitle: title,
            chapterNum: activeScrape.chapter.number,
            coverUrl,
          });
        }
      } catch (_e) {}
      setActiveScrape(null);
    },
    [activeScrape, startSourceDownload]
  );

  const handleScrapeError = useCallback(() => {
    if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current);
    setActiveScrape(null);
  }, []);

  const onDownloadRequest = useCallback(
    (chapter: DownloadableChapter, chapterUrl: string, chapterId: string) => {
      const dl = downloads[chapterId];
      if (dl?.status === "downloading") {
        cancelDownload(chapterId);
        return;
      }
      if (dl?.status === "done") return;
      if (src === "rorym") {
        if (!chapter.pages?.length) return;
        startSourceDownload(chapterId, chapter.pages, {
          mangaTitle: title,
          chapterNum: chapter.number,
          coverUrl,
        });
        return;
      }
      const alreadyQueued = scrapeQueue.some((j) => j.chapterId === chapterId);
      const isActive = activeScrape?.chapterId === chapterId;
      if (alreadyQueued || isActive) return;
      setScrapeQueue((prev) => [...prev, { chapter, url: chapterUrl, chapterId }]);
    },
    [
      downloads,
      cancelDownload,
      src,
      startSourceDownload,
      title,
      coverUrl,
      scrapeQueue,
      activeScrape,
    ]
  );
  // ────────────────────────────────────────────────────────────────────────────

  const rating = params.rating ? decodeURIComponent(params.rating) : "";
  const genreList: string[] = params.genres
    ? decodeURIComponent(params.genres).split(",").filter(Boolean)
    : [];
  const latestChapter = params.latestChapter
    ? decodeURIComponent(params.latestChapter)
    : undefined;

  useEffect(() => {
    if (!slug) return;
    setChaptersLoading(true);
    setChaptersError(false);
    fetch(getChapterFetchApi(src, slug, latestChapter))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ chapters: DownloadableChapter[] }>;
      })
      .then((d) => {
        setChapters(d.chapters ?? []);
        setChaptersLoading(false);
      })
      .catch(() => {
        setChaptersError(true);
        setChaptersLoading(false);
      });
  }, [slug, src]);

  const mangaUrl = buildMangaUrl(src, slug);
  const displayChapters = showAllChapters ? chapters : chapters.slice(0, 30);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={styles.hero}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.backdrop} contentFit="cover" />
          ) : null}
          <LinearGradient
            colors={["rgba(15,15,15,0.1)", "rgba(15,15,15,0.85)", "#0F0F0F"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + 56 }]}>
            <View
              style={[
                styles.coverShadow,
                { borderRadius: colors.radius, shadowColor: colors.primary },
              ]}
            >
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={[styles.cover, { borderRadius: colors.radius }]}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.cover,
                    { backgroundColor: colors.card, borderRadius: colors.radius },
                  ]}
                />
              )}
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={3}>
                {title}
              </Text>
              <View style={styles.badgeRow}>
                {rating ? (
                  <View style={[styles.ratingBadge, { backgroundColor: "rgba(255,215,0,0.15)" }]}>
                    <Text style={styles.ratingText}>⭐ {rating}</Text>
                  </View>
                ) : null}
                <View style={styles.sourceBadge}>
                  <Feather name="globe" size={10} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.sourceBadgeText}>{getSourceLabel(src)}</Text>
                </View>
              </View>
              {genreList.length > 0 && (
                <View style={styles.genreRow}>
                  {genreList.slice(0, 3).map((g) => (
                    <Pressable
                      key={g}
                      style={({ pressed }) => [
                        styles.genreBadge,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/genre/[name]" as any,
                          params: { name: encodeURIComponent(g) },
                        })
                      }
                    >
                      <Text style={styles.genreText}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── ACTIONS ── */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                  flex: 1,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (chapters.length > 0) {
                  if (src === "rorym") void recordRorymMangaRead(slug);
                  const first = chapters[chapters.length - 1];
                  if (src === "rorym") {
                    router.push({
                      pathname: "/rorym/reader" as any,
                      params: {
                        slug: encodeURIComponent(slug),
                        chapterNum: encodeURIComponent(first.number),
                        title: encodeURIComponent(title),
                      },
                    });
                  } else {
                    router.push({
                      pathname: "/starz/reader" as any,
                      params: {
                        url: encodeURIComponent(first.url || buildChapterUrl(src, slug, first.number)),
                        title: encodeURIComponent(title),
                        chapterNum: encodeURIComponent(first.number),
                        slug: encodeURIComponent(slug),
                        latestChapter: encodeURIComponent(chapters[0]?.number ?? ""),
                        src,
                      },
                    });
                  }
                } else if (mangaUrl) {
                  Linking.openURL(mangaUrl);
                }
              }}
            >
              <Feather name="book-open" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>ابدأ القراءة</Text>
            </Pressable>

            {src !== "rorym" && (
              <Pressable
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.8 : 1,
                    borderRadius: colors.radius,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  Linking.openURL(mangaUrl);
                }}
              >
                <Feather name="external-link" size={20} color={colors.foreground} />
              </Pressable>
            )}
          </View>

          {/* ── CHAPTERS HEADER ── */}
          <View style={styles.chaptersHeader}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              الفصول
              {chapters.length > 0 ? ` (${chapters.length})` : ""}
              {chaptersLoading ? " ..." : ""}
            </Text>
            {scrapeQueue.length > 0 && (
              <View style={styles.queueBadge}>
                <ActivityIndicator size={10} color={colors.primary} />
                <Text style={[styles.queueText, { color: colors.mutedForeground }]}>
                  {scrapeQueue.length + (activeScrape ? 1 : 0)} في الطابور
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CHAPTER LIST ── */}
        {chaptersLoading ? (
          <View style={styles.chaptersLoader}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              جارٍ تحميل الفصول...
            </Text>
          </View>
        ) : chaptersError || chapters.length === 0 ? (
          <View style={styles.noChapters}>
            <Feather name="inbox" size={40} color={colors.muted} />
            <Text style={[styles.noChaptersText, { color: colors.mutedForeground }]}>
              {chaptersError
                ? "تعذّر تحميل الفصول — قد تكون الصفحة محجوبة"
                : "لا تتوفر فصول حالياً"}
            </Text>
            <Pressable
              style={[
                styles.openMangaBtn,
                { backgroundColor: colors.primary + "20", borderRadius: colors.radius },
              ]}
              onPress={() => Linking.openURL(mangaUrl)}
            >
              <Feather name="external-link" size={14} color={colors.primary} />
              <Text style={[styles.openMangaBtnText, { color: colors.primary }]}>
                افتح في موقع المانجا
              </Text>
            </Pressable>
          </View>
        ) : (
          displayChapters.map((ch) => (
            <StarzChapterItem
              key={ch.number}
              chapter={ch}
              slug={slug}
              src={src}
              mangaTitle={title}
              coverUrl={coverUrl}
              latestChapterNum={chapters[0]?.number ?? ""}
              onDownloadRequest={onDownloadRequest}
            />
          ))
        )}

        {/* Show more */}
        {chapters.length > 30 && (
          <Pressable
            style={[
              styles.showMoreBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setShowAllChapters((v) => !v)}
          >
            <Text style={[styles.showMoreText, { color: colors.primary }]}>
              {showAllChapters
                ? "عرض أقل"
                : `عرض كل الفصول (${chapters.length})`}
            </Text>
            <Feather
              name={showAllChapters ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.primary}
            />
          </Pressable>
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>

      {/* ── BACK BUTTON ── */}
      <View style={[styles.backBtn, { top: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backPressable, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* ── HIDDEN SCRAPER WEBVIEW ── */}
      {activeScrape && (
        <WebView
          source={{ uri: activeScrape.url }}
          style={styles.hiddenWebView}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          injectedJavaScript={EXTRACT_IMAGES_JS}
          onMessage={(e) => handleExtractedImages(e.nativeEvent.data)}
          onError={handleScrapeError}
          onHttpError={handleScrapeError}
        />
      )}
    </View>
  );
}

function StarzChapterItem({
  chapter,
  slug,
  src,
  mangaTitle,
  coverUrl,
  latestChapterNum,
  onDownloadRequest,
}: {
  chapter: DownloadableChapter;
  slug: string;
  src: SrcParam;
  mangaTitle: string;
  coverUrl: string;
  latestChapterNum: string;
  onDownloadRequest: (chapter: DownloadableChapter, url: string, chapterId: string) => void;
}) {
  "use no memo";
  const colors = useColors();
  const router = useRouter();
  const { downloads } = useDownloads();

  const chapterId = makeChapterId(src, slug, chapter.number);
  const dl = downloads[chapterId];
  const isDownloading = dl?.status === "downloading";
  const isDone = dl?.status === "done";
  const progress = dl?.progress ?? 0;

  const handlePress = () => {
    Haptics.selectionAsync();
    if (src === "rorym") {
      void recordRorymMangaRead(slug);
      router.push({
        pathname: "/rorym/reader" as any,
        params: {
          slug: encodeURIComponent(slug),
          chapterNum: encodeURIComponent(chapter.number),
          title: encodeURIComponent(mangaTitle),
        },
      });
      return;
    }
    const url = chapter.url || buildChapterUrl(src, slug, chapter.number);
    router.push({
      pathname: "/starz/reader" as any,
      params: {
        url: encodeURIComponent(url),
        title: encodeURIComponent(mangaTitle),
        chapterNum: encodeURIComponent(chapter.number),
        slug: encodeURIComponent(slug),
        latestChapter: encodeURIComponent(latestChapterNum),
        src,
      },
    });
  };

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = chapter.url || buildChapterUrl(src, slug, chapter.number);
    onDownloadRequest(chapter, url, chapterId);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        chStyles.container,
        {
          backgroundColor: pressed ? colors.secondary : "transparent",
          borderBottomColor: colors.border,
        },
      ]}
      onPress={handlePress}
    >
      <View style={chStyles.left}>
        <Text style={[chStyles.chapterNum, { color: colors.foreground }]}>
          فصل {chapter.number}
        </Text>
        <View style={chStyles.metaRow}>
          {isDone && (
            <View style={[chStyles.offlineBadge, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="wifi-off" size={10} color={colors.primary} />
              <Text style={[chStyles.offlineText, { color: colors.primary }]}>محمّل</Text>
            </View>
          )}
          {coverUrl === "" && null}
        </View>
        {isDownloading && (
          <View style={[chStyles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                chStyles.progressFill,
                { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
        )}
      </View>

      <View style={chStyles.actions}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            handlePress();
          }}
          style={({ pressed }) => [
            chStyles.readBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="book-open" size={13} color="#fff" />
          <Text style={chStyles.readBtnText}>قراءة</Text>
        </Pressable>

        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            handleDownload();
          }}
          hitSlop={6}
          style={({ pressed }) => [
            chStyles.dlBtn,
            {
              backgroundColor: isDone ? colors.primary + "20" : colors.secondary,
              borderColor: isDone ? colors.primary + "55" : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          disabled={isDone}
        >
          {isDownloading ? (
            <ActivityIndicator size={13} color={colors.primary} />
          ) : isDone ? (
            <Feather name="check-circle" size={13} color={colors.primary} />
          ) : (
            <Feather name="download" size={13} color={colors.foreground} />
          )}
          <Text style={[chStyles.dlBtnText, { color: isDone ? colors.primary : colors.foreground }]}>
            {isDone ? "محمّل" : "تنزيل"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const chStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  left: { flex: 1, gap: 3 },
  chapterNum: { fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  offlineText: { fontSize: 10, fontWeight: "700" },
  progressBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  readBtn: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  readBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dlBtn: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dlBtnText: { fontSize: 11, fontWeight: "700" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 340, position: "relative", overflow: "hidden" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  coverShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  cover: { width: 110, height: 156 },
  heroInfo: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#fff", lineHeight: 26 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#FFD700" },
  sourceBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  sourceBadgeText: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  genreRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  genreBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  genreText: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "500" },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  actions: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  iconBtn: { width: 48, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 17, fontWeight: "700" },
  chaptersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  queueText: { fontSize: 11 },
  chaptersLoader: { paddingVertical: 32, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13 },
  noChapters: { padding: 32, alignItems: "center", gap: 12 },
  noChaptersText: { fontSize: 14, textAlign: "center" },
  openMangaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  openMangaBtnText: { fontSize: 14, fontWeight: "600" },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  showMoreText: { fontSize: 14, fontWeight: "600" },
  backBtn: { position: "absolute", left: 14 },
  backPressable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenWebView: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
});
