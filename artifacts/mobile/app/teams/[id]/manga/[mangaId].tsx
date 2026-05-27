"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getPublicTeam, type PublicTeam, type PublicTeamChapter, type PublicTeamManga } from "@/lib/teams";

const MANGADEX_ID_RE = /^[0-9a-f-]{36}$/;
const isMangaDexId = (id: string) => MANGADEX_ID_RE.test(id);

export default function TeamMangaScreen() {
  "use no memo";
  const { id: teamId, mangaId } = useLocalSearchParams<{ id: string; mangaId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getPublicTeam(teamId);
      setTeam(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const manga: PublicTeamManga | null = team?.manga.find((m) => m.id === mangaId) ?? null;
  const isMangaDex = isMangaDexId(mangaId ?? "");
  const topPad = Platform.OS === "web" ? 20 : insets.top + 16;

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>جارٍ التحميل...</Text>
        </View>
      </View>
    );
  }

  /* ── Error or manga not found ── */
  if (error || !team || !manga) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={44} color={colors.muted} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>تعذّر تحميل المانجا</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={load}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const readableChapters = manga.chapters.filter((ch) => isMangaDexId(ch.id)).length;
  const firstReadableChapter = manga.chapters.find((ch) => isMangaDexId(ch.id)) ?? null;

  const renderChapter = ({ item, index }: { item: PublicTeamChapter; index: number }) => {
    const canRead = isMangaDexId(item.id);
    const isLast = index === manga.chapters.length - 1;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.chapterRow,
          {
            borderBottomColor: colors.border,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            opacity: pressed && canRead ? 0.7 : 1,
            backgroundColor: canRead ? "transparent" : colors.secondary + "40",
          },
        ]}
        onPress={
          canRead
            ? () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/reader/${item.id}` as any);
              }
            : undefined
        }
        disabled={!canRead}
      >
        <View style={[styles.chapterBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.chapterBadgeText, { color: colors.primary }]}>{item.number}</Text>
        </View>

        <Text style={[styles.chapterTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title || `فصل ${item.number}`}
        </Text>

        {item.imageCount > 0 && (
          <View style={[styles.imageCountPill, { backgroundColor: colors.secondary }]}>
            <Feather name="image" size={10} color={colors.mutedForeground} />
            <Text style={[styles.imageCountText, { color: colors.mutedForeground }]}>{item.imageCount}</Text>
          </View>
        )}

        {canRead ? (
          <View style={[styles.readPill, { backgroundColor: colors.primary }]}>
            <Feather name="book-open" size={12} color="#fff" />
            <Text style={styles.readPillText}>اقرأ</Text>
          </View>
        ) : (
          <View style={[styles.localPill, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.localPillText, { color: colors.mutedForeground }]}>محلي</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {manga.title}
        </Text>
        {isMangaDex && (
          <Pressable
            onPress={() => router.push(`/manga/${mangaId}` as any)}
            hitSlop={8}
            style={[styles.mdxBtn, { backgroundColor: colors.primary + "18", borderRadius: 8 }]}
          >
            <Feather name="external-link" size={14} color={colors.primary} />
          </Pressable>
        )}
        {!isMangaDex && <View style={{ width: 30 }} />}
      </View>

      <FlatList
        data={manga.chapters}
        keyExtractor={(item) => item.id}
        renderItem={renderChapter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: colors.card }]}>
              {/* Blurred cover bg hint */}
              <View style={styles.heroContent}>
                {manga.coverUrl ? (
                  <Image source={{ uri: manga.coverUrl }} style={styles.heroCover} contentFit="cover" />
                ) : (
                  <View style={[styles.heroCoverPlaceholder, { backgroundColor: colors.secondary }]}>
                    <Feather name="book" size={36} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.heroInfo}>
                  <Text style={[styles.heroTitle, { color: colors.foreground }]}>{manga.title}</Text>
                  {!!manga.description && (
                    <Text style={[styles.heroDesc, { color: colors.mutedForeground }]} numberOfLines={4}>
                      {manga.description}
                    </Text>
                  )}

                  {/* Team badge */}
                  <Pressable
                    style={[styles.teamBadge, { backgroundColor: colors.primary + "18", borderRadius: 8 }]}
                    onPress={() => router.back()}
                  >
                    <Text style={[styles.teamBadgeText, { color: colors.primary }]}>
                      {team.emoji} {team.name}
                    </Text>
                  </Pressable>

                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Feather name="layers" size={12} color={colors.primary} />
                      <Text style={[styles.statText, { color: colors.foreground }]}>
                        {manga.chapters.length} فصل
                      </Text>
                    </View>
                    {readableChapters > 0 && (
                      <View style={styles.statItem}>
                        <Feather name="book-open" size={12} color={colors.primary} />
                        <Text style={[styles.statText, { color: colors.foreground }]}>
                          {readableChapters} قابل للقراءة
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                {firstReadableChapter ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.startBtn,
                      { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.82 : 1, flex: isMangaDex ? 1 : undefined },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(`/reader/${firstReadableChapter.id}` as any);
                    }}
                  >
                    <Feather name="play" size={16} color="#fff" />
                    <Text style={styles.startBtnText}>ابدأ القراءة</Text>
                  </Pressable>
                ) : null}

                {isMangaDex && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.mdxFullBtn,
                      {
                        backgroundColor: firstReadableChapter ? colors.card : colors.primary,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.8 : 1,
                        flex: firstReadableChapter ? undefined : 1,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/manga/${mangaId}` as any);
                    }}
                  >
                    <Feather name="external-link" size={14} color={firstReadableChapter ? colors.foreground : "#fff"} />
                    <Text style={[styles.mdxFullBtnText, { color: firstReadableChapter ? colors.foreground : "#fff" }]}>
                      MangaDex
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Chapters header */}
            {manga.chapters.length > 0 && (
              <View style={[styles.chaptersHeader, { borderBottomColor: colors.border }]}>
                <Feather name="list" size={14} color={colors.primary} />
                <Text style={[styles.chaptersHeaderText, { color: colors.foreground }]}>
                  فصول الفريق
                </Text>
                <Text style={[styles.chaptersHeaderCount, { color: colors.mutedForeground }]}>
                  {manga.chapters.length}
                </Text>
              </View>
            )}

            {manga.chapters.length === 0 && (
              <View style={styles.emptyChapters}>
                <Feather name="book" size={36} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  لم يُضف الفريق أي فصول بعد
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  mdxBtn: { padding: 7 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14 },
  errorTitle: { fontSize: 17, fontWeight: "700" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  /* Hero */
  hero: { padding: 16, gap: 14 },
  heroContent: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  heroCover: { width: 110, height: 155, borderRadius: 8 },
  heroCoverPlaceholder: { width: 110, height: 155, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  heroInfo: { flex: 1, gap: 8 },
  heroTitle: { fontSize: 17, fontWeight: "800", lineHeight: 24 },
  heroDesc: { fontSize: 12, lineHeight: 18 },
  teamBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5 },
  teamBadgeText: { fontSize: 13, fontWeight: "700" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 10 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  startBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  mdxFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mdxFullBtnText: { fontSize: 13, fontWeight: "600" },

  /* Chapters list */
  chaptersHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chaptersHeaderText: { flex: 1, fontSize: 14, fontWeight: "700" },
  chaptersHeaderCount: { fontSize: 13 },

  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chapterBadge: {
    minWidth: 44,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  chapterBadgeText: { fontSize: 13, fontWeight: "700" },
  chapterTitle: { flex: 1, fontSize: 13 },
  imageCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  imageCountText: { fontSize: 10 },
  readPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  readPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  localPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  localPillText: { fontSize: 11, fontWeight: "600" },

  emptyChapters: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
