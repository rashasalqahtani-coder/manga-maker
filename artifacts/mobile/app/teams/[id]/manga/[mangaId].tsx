"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getLastReadChapter, type HistoryEntry } from "@/app/(tabs)/history";
import { useTeam } from "@/context/TeamContext";
import { useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { downloadPublishedTeamChapter, isChapterDownloaded } from "@/lib/download";
import { getPublicTeam, type PublicTeam, type PublicTeamChapter, type PublicTeamManga } from "@/lib/teams";

const MANGADEX_ID_RE = /^[0-9a-f-]{36}$/;
const isMangaDexId = (id: string) => MANGADEX_ID_RE.test(id);

export default function TeamMangaScreen() {
  "use no memo";
  const { id: teamId, mangaId } = useLocalSearchParams<{ id: string; mangaId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { team: localTeam } = useTeam();
  const { refreshMeta } = useDownloads();
  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRead, setLastRead] = useState<HistoryEntry | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!mangaId) return;
    setLastRead(null);
    getLastReadChapter(mangaId).then(setLastRead);
  }, [mangaId]);

  const manga: PublicTeamManga | null = team?.manga.find((m) => m.id === mangaId) ?? null;

  // Check which published chapters are already downloaded
  useEffect(() => {
    if (!manga) return;
    const checkAll = async () => {
      const results = await Promise.all(
        manga.chapters.map(async (ch) => ({ id: ch.id, done: await isChapterDownloaded(ch.id) }))
      );
      setDownloadedIds(new Set(results.filter((r) => r.done).map((r) => r.id)));
    };
    checkAll().catch(() => {});
  }, [manga]);
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

  // Local team manga (for reading locally-uploaded chapters)
  const localManga = localTeam?.manga.find((m) => m.id === mangaId) ?? null;

  const readableChapters = manga.chapters.filter((ch) => {
    if (isMangaDexId(ch.id)) return true;
    if (ch.imageUrls && ch.imageUrls.length > 0) return true;
    const local = localManga?.chapters.find((c) => c.id === ch.id);
    return (local?.imageUris?.length ?? 0) > 0;
  }).length;

  const firstReadableChapter = manga.chapters.find((ch) => {
    if (isMangaDexId(ch.id)) return true;
    if (ch.imageUrls && ch.imageUrls.length > 0) return true;
    const local = localManga?.chapters.find((c) => c.id === ch.id);
    return (local?.imageUris?.length ?? 0) > 0;
  }) ?? null;

  const navigateToChapter = (ch: PublicTeamChapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isMangaDexId(ch.id)) {
      router.push({
        pathname: "/reader/[chapterId]" as any,
        params: {
          chapterId: ch.id,
          mangaId: mangaId ?? "",
          mangaTitle: manga.title,
          coverUrl: manga.coverUrl ?? "",
          chapterNum: ch.number,
        },
      });
    } else if (ch.imageUrls && ch.imageUrls.length > 0) {
      // Published team chapter with hosted images → pass as JSON param
      router.push({
        pathname: "/team/reader" as any,
        params: {
          mangaId: mangaId ?? "",
          chapterId: ch.id,
          imageUrlsJson: JSON.stringify(ch.imageUrls),
        },
      });
    } else {
      router.push({
        pathname: "/team/reader" as any,
        params: { mangaId: localManga?.id ?? mangaId ?? "", chapterId: ch.id },
      });
    }
  };

  const handleDownloadPublished = async (ch: PublicTeamChapter) => {
    if (!ch.imageUrls || ch.imageUrls.length === 0) return;
    if (downloadingId) return;
    setDownloadingId(ch.id);
    try {
      await downloadPublishedTeamChapter(
        { id: ch.id, imageUrls: ch.imageUrls, number: ch.number },
        mangaId ?? "",
        manga.title,
        manga.coverUrl ?? "",
        () => {}
      );
      await refreshMeta();
      setDownloadedIds((prev) => new Set([...prev, ch.id]));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم التنزيل", `فصل ${ch.number} جاهز للقراءة بدون إنترنت.`);
    } catch {
      Alert.alert("خطأ", "تعذّر تنزيل الفصل.");
    } finally {
      setDownloadingId(null);
    }
  };

  const renderChapter = ({ item, index }: { item: PublicTeamChapter; index: number }) => {
    const isMdx = isMangaDexId(item.id);
    const localCh = localManga?.chapters.find((c) => c.id === item.id);
    const hasLocalImages = (localCh?.imageUris?.length ?? 0) > 0;
    const hasPublishedImages = (item.imageUrls?.length ?? 0) > 0;
    const canRead = isMdx || hasLocalImages || hasPublishedImages;
    const isLast = index === manga.chapters.length - 1;
    const alreadyDownloaded = downloadedIds.has(item.id);
    const isDownloading = downloadingId === item.id;

    return (
      <View
        style={[
          styles.chapterRow,
          {
            borderBottomColor: colors.border,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            backgroundColor: canRead ? "transparent" : colors.secondary + "40",
          },
        ]}
      >
        <Pressable
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
          onPress={canRead ? () => navigateToChapter(item) : undefined}
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
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* Download button for chapters with hosted images */}
          {hasPublishedImages && !alreadyDownloaded && (
            <Pressable
              onPress={() => handleDownloadPublished(item)}
              disabled={isDownloading || !!downloadingId}
              style={({ pressed }) => [
                styles.downloadBtn,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {isDownloading ? (
                <ActivityIndicator size={12} color={colors.primary} />
              ) : (
                <Feather name="download" size={12} color={colors.mutedForeground} />
              )}
            </Pressable>
          )}

          {alreadyDownloaded && (
            <View style={[styles.downloadBtn, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="check" size={12} color={colors.primary} />
            </View>
          )}

          {canRead ? (
            <Pressable
              style={[styles.readPill, { backgroundColor: colors.primary }]}
              onPress={() => navigateToChapter(item)}
            >
              <Feather name="book-open" size={12} color="#fff" />
              <Text style={styles.readPillText}>اقرأ</Text>
            </Pressable>
          ) : (
            <View style={[styles.localPill, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.localPillText, { color: colors.mutedForeground }]}>محلي</Text>
            </View>
          )}
        </View>
      </View>
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
                {(lastRead ?? firstReadableChapter) ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.startBtn,
                      { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.82 : 1, flex: isMangaDex ? 1 : undefined },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (lastRead) {
                        // Resume from history (always MangaDex chapter)
                        router.push({
                          pathname: "/reader/[chapterId]" as any,
                          params: {
                            chapterId: lastRead.chapterId,
                            mangaId: mangaId ?? "",
                            mangaTitle: manga.title,
                            coverUrl: manga.coverUrl ?? "",
                            chapterNum: lastRead.chapterNum ?? "",
                          },
                        });
                      } else {
                        navigateToChapter(firstReadableChapter!);
                      }
                    }}
                  >
                    <Feather name="play" size={16} color="#fff" />
                    <View>
                      <Text style={styles.startBtnText}>
                        {lastRead ? "استكمل القراءة" : "ابدأ القراءة"}
                      </Text>
                      {lastRead?.chapterNum ? (
                        <Text style={styles.startBtnSub}>فصل {lastRead.chapterNum}</Text>
                      ) : null}
                    </View>
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
  startBtnSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "500", marginTop: 1 },
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
  downloadBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  emptyChapters: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
