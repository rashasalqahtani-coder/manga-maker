import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  getComickChapters,
  getComickCoverUrl,
  getComickMangaDetail,
  getComickStatus,
  getComickTitle,
  getComickType,
  type ComickChapter,
  type ComickManga,
} from "@/lib/comick";

export default function ComickMangaScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [manga, setManga]       = useState<ComickManga | null>(null);
  const [chapters, setChapters] = useState<ComickChapter[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingCh, setLoadingCh] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getComickMangaDetail(slug)
      .then(setManga)
      .finally(() => setLoading(false));

    setLoadingCh(true);
    getComickChapters(slug)
      .then(setChapters)
      .finally(() => setLoadingCh(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!manga) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>تعذّر تحميل المانجا</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.foreground }}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const coverUrl = getComickCoverUrl(manga);
  const title    = getComickTitle(manga);
  const desc     = manga.desc?.replace(/<[^>]*>/g, "") ?? "";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.navBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtnNav} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
        {/* Source badge */}
        <View style={[styles.sourceBadge, { backgroundColor: "#0EA5E9" + "22" }]}>
          <Text style={[styles.sourceBadgeText, { color: "#0EA5E9" }]}>ComicK</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover + info */}
        <View style={styles.heroSection}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={[styles.cover, { borderRadius: colors.radius }]} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Feather name="book" size={36} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.heroInfo}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>{title}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>{getComickType(manga)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{getComickStatus(manga)}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Feather name="book-open" size={13} color={colors.primary} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>{chapters.length} فصل</Text>
              </View>
              <View style={styles.statItem}>
                <Feather name="globe" size={13} color="#0EA5E9" />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>ComicK.io</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Genres */}
        {manga.genres && manga.genres.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
            {manga.genres.map((g) => (
              <View key={g.name} style={[styles.genreChip, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
                <Text style={[styles.genreText, { color: colors.mutedForeground }]}>{g.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Description */}
        {desc ? (
          <Pressable onPress={() => setExpanded((v) => !v)} style={styles.descSection}>
            <Text style={[styles.descText, { color: colors.mutedForeground }]} numberOfLines={expanded ? undefined : 3}>
              {desc}
            </Text>
            <Text style={[styles.descToggle, { color: colors.primary }]}>
              {expanded ? "إخفاء" : "قراءة المزيد"}
            </Text>
          </Pressable>
        ) : null}

        {/* Chapter list */}
        <View style={styles.chapterSection}>
          <View style={styles.chapterHeader}>
            <Text style={[styles.chapterHeaderTitle, { color: colors.foreground }]}>الفصول العربية</Text>
            <Text style={[styles.chapterCount, { color: colors.mutedForeground }]}>
              {loadingCh ? "..." : `${chapters.length} فصل`}
            </Text>
          </View>

          {loadingCh ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>جار تحميل الفصول...</Text>
            </View>
          ) : chapters.length === 0 ? (
            <View style={styles.emptyChapters}>
              <Feather name="info" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyChaptersText, { color: colors.mutedForeground }]}>لا توجد فصول عربية بعد</Text>
            </View>
          ) : (
            chapters.map((ch) => (
              <Pressable
                key={ch.hid}
                style={({ pressed }) => [
                  styles.chapterRow,
                  { backgroundColor: pressed ? colors.secondary : colors.card, borderRadius: colors.radius },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/comick/reader/${ch.hid}` as any);
                }}
              >
                <View style={styles.chapterRowLeft}>
                  <Text style={[styles.chapterNum, { color: colors.foreground }]}>
                    {ch.chap ? `فصل ${ch.chap}` : ch.title ?? "فصل"}
                    {ch.vol ? ` • مجلد ${ch.vol}` : ""}
                  </Text>
                  {ch.group_name && ch.group_name.length > 0 && (
                    <Text style={[styles.chapterGroup, { color: colors.mutedForeground }]}>
                      {ch.group_name[0]}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 15, textAlign: "center" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtnNav: {},
  navTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  heroSection: { flexDirection: "row", padding: 16, gap: 14 },
  cover: { width: 110, height: 158 },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroInfo: { flex: 1, gap: 8, justifyContent: "center" },
  heroTitle: { fontSize: 17, fontWeight: "700", lineHeight: 24 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 14 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12 },
  genreRow: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 6 },
  genreText: { fontSize: 12, fontWeight: "500" },
  descSection: { paddingHorizontal: 16, marginBottom: 16, gap: 6 },
  descText: { fontSize: 13, lineHeight: 20 },
  descToggle: { fontSize: 12, fontWeight: "600" },
  chapterSection: { paddingHorizontal: 16, gap: 8 },
  chapterHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  chapterHeaderTitle: { fontSize: 16, fontWeight: "700" },
  chapterCount: { fontSize: 12 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, justifyContent: "center" },
  loadingText: { fontSize: 13 },
  emptyChapters: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyChaptersText: { fontSize: 13 },
  chapterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, marginBottom: 2 },
  chapterRowLeft: { flex: 1, gap: 3 },
  chapterNum: { fontSize: 14, fontWeight: "600" },
  chapterGroup: { fontSize: 11 },
});
