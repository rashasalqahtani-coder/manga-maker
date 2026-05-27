"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { useColors } from "@/hooks/useColors";
import {
  buildChapterUrl,
  buildMangaUrl,
  type StarzChapter,
} from "@/lib/mangastarz";

// Chapter patterns built from known URL structure since manga detail pages
// are Cloudflare-protected server-side. Chapters are opened in external browser.
const API_BASE =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`
    : "/api";

const CHAPTER_FETCH_API = (slug: string, latestChapter?: string) => {
  const base = `${API_BASE}/starz/manga/${encodeURIComponent(slug)}/chapters`;
  if (latestChapter) return `${base}?latest=${encodeURIComponent(latestChapter)}`;
  return base;
};

export default function StarzMangaDetailScreen() {
  "use no memo";
  const params = useLocalSearchParams<{
    slug: string;
    title?: string;
    coverUrl?: string;
    rating?: string;
    genres?: string;
    latestChapter?: string;
  }>();
  const slug = params.slug ?? "";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [chapters, setChapters] = useState<StarzChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);

  // Derive display title — prefer param, fall back to slug
  const title = params.title
    ? decodeURIComponent(params.title)
    : slug.replace(/-/g, " ");
  const coverUrl = params.coverUrl ? decodeURIComponent(params.coverUrl) : "";
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
    fetch(CHAPTER_FETCH_API(slug, latestChapter))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ chapters: StarzChapter[] }>;
      })
      .then((d) => {
        setChapters(d.chapters ?? []);
        setChaptersLoading(false);
      })
      .catch(() => {
        setChaptersError(true);
        setChaptersLoading(false);
      });
  }, [slug]);

  const mangaUrl = buildMangaUrl(slug);
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
                  <Text style={styles.sourceBadgeText}>مانجا ستارز</Text>
                </View>
              </View>
              {genreList.length > 0 && (
                <View style={styles.genreRow}>
                  {genreList.slice(0, 3).map((g) => (
                    <View key={g} style={styles.genreBadge}>
                      <Text style={styles.genreText}>{g}</Text>
                    </View>
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
                  // Open last (oldest) chapter to start from beginning
                  Linking.openURL(chapters[chapters.length - 1].url);
                } else {
                  Linking.openURL(mangaUrl);
                }
              }}
            >
              <Feather name="book-open" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>ابدأ القراءة</Text>
            </Pressable>

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
          </View>

          {/* ── Notice ── */}
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={13} color={colors.mutedForeground} />
            <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
              تُفتح الفصول في متصفحك — المحتوى مستضاف على مانجا ستارز
            </Text>
          </View>

          {/* ── CHAPTERS HEADER ── */}
          <View style={styles.chaptersHeader}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              الفصول
              {chapters.length > 0 ? ` (${chapters.length})` : ""}
              {chaptersLoading ? " ..." : ""}
            </Text>
            <View style={[styles.externalNote, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="external-link" size={11} color={colors.primary} />
              <Text style={[styles.externalNoteText, { color: colors.primary }]}>
                في المتصفح
              </Text>
            </View>
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
                افتح في موقع مانجا ستارز
              </Text>
            </Pressable>
          </View>
        ) : (
          displayChapters.map((ch) => (
            <StarzChapterItem key={ch.number} chapter={ch} slug={slug} />
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
    </View>
  );
}

function StarzChapterItem({ chapter, slug }: { chapter: StarzChapter; slug: string }) {
  "use no memo";
  const colors = useColors();

  const handlePress = () => {
    Haptics.selectionAsync();
    const url = chapter.url || buildChapterUrl(slug, chapter.number);
    Linking.openURL(url);
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
      </View>

      <View
        style={[
          chStyles.externalBadge,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name="external-link" size={10} color={colors.mutedForeground} />
        <Text style={[chStyles.externalText, { color: colors.mutedForeground }]}>متصفح</Text>
      </View>

      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
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
  externalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  externalText: { fontSize: 10, fontWeight: "600" },
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
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  sectionLabel: { fontSize: 17, fontWeight: "700" },
  chaptersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  externalNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  externalNoteText: { fontSize: 11, fontWeight: "600" },
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
});
