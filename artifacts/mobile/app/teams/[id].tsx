"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getPublicTeam, type PublicTeam, type PublicTeamManga } from "@/lib/teams";

const MANGADEX_ID_RE = /^[0-9a-f-]{36}$/;

function isMangaDexManga(id: string) {
  return MANGADEX_ID_RE.test(id);
}

export default function TeamDetailScreen() {
  "use no memo";
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedManga, setExpandedManga] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getPublicTeam(id);
      setTeam(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const topPad = Platform.OS === "web" ? 20 : insets.top + 16;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            جارٍ تحميل الفريق...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !team) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={44} color={colors.muted} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>تعذّر تحميل الفريق</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={load}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {team.emoji} {team.name}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Team hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <View style={[styles.heroEmoji, { backgroundColor: colors.primary + "18" }]}>
            <Text style={styles.heroEmojiText}>{team.emoji}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{team.name}</Text>
          {team.description ? (
            <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
              {team.description}
            </Text>
          ) : null}
          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{team.manga.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>مانجا</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>
                {team.manga.reduce((s, m) => s + m.chapters.length, 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>فصل</Text>
            </View>
          </View>
        </View>

        {/* Manga section header */}
        {team.manga.length > 0 && (
          <View style={styles.sectionHeader}>
            <Feather name="book-open" size={14} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              أعمال الفريق
            </Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {team.manga.length}
            </Text>
          </View>
        )}

        {/* Manga list */}
        <View style={styles.mangaList}>
          {team.manga.map((manga) => (
            <MangaEntry
              key={manga.id}
              manga={manga}
              expanded={expandedManga === manga.id}
              onToggle={() => {
                Haptics.selectionAsync();
                setExpandedManga((prev) => (prev === manga.id ? null : manga.id));
              }}
              onRead={() => {
                if (isMangaDexManga(manga.id)) {
                  router.push(`/manga/${manga.id}` as any);
                }
              }}
            />
          ))}
        </View>

        {team.manga.length === 0 && (
          <View style={styles.emptyManga}>
            <Feather name="book" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              لم يُضف الفريق أي أعمال بعد
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MangaEntry({
  manga,
  expanded,
  onToggle,
  onRead,
}: {
  manga: PublicTeamManga;
  expanded: boolean;
  onToggle: () => void;
  onRead: () => void;
}) {
  const colors = useColors();
  const canRead = isMangaDexManga(manga.id);

  return (
    <View style={[styles.mangaCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
      <Pressable style={styles.mangaRow} onPress={onToggle}>
        {manga.coverUrl ? (
          <Image
            source={{ uri: manga.coverUrl }}
            style={styles.mangaCover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.mangaCoverPlaceholder, { backgroundColor: colors.secondary }]}>
            <Feather name="book" size={16} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.mangaInfo}>
          <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={2}>
            {manga.title}
          </Text>
          {manga.description ? (
            <Text style={[styles.mangaDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {manga.description}
            </Text>
          ) : null}
          <View style={styles.mangaMeta}>
            <View style={styles.metaItem}>
              <Feather name="layers" size={11} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                {manga.chapters.length} {manga.chapters.length === 1 ? "فصل" : "فصول"}
              </Text>
            </View>
            {!canRead && (
              <View style={[styles.localBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.localBadgeText, { color: colors.mutedForeground }]}>
                  محلي
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.mangaActions}>
          {canRead && (
            <Pressable
              style={[styles.readBtn, { backgroundColor: colors.primary }]}
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                onRead();
              }}
            >
              <Feather name="book-open" size={13} color="#fff" />
              <Text style={styles.readBtnText}>اقرأ</Text>
            </Pressable>
          )}
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={17}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {/* Chapters */}
      {expanded && manga.chapters.length > 0 && (
        <View style={[styles.chapterList, { borderTopColor: colors.border }]}>
          {manga.chapters.map((ch, idx) => (
            <View
              key={ch.id}
              style={[
                styles.chapterRow,
                { borderBottomColor: colors.border },
                idx === manga.chapters.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={[styles.chapterBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.chapterBadgeText, { color: colors.primary }]}>
                  {ch.number}
                </Text>
              </View>
              <Text style={[styles.chapterTitle, { color: colors.foreground }]} numberOfLines={1}>
                {ch.title || `فصل ${ch.number}`}
              </Text>
              {ch.imageCount > 0 && (
                <View style={[styles.imagePill, { backgroundColor: colors.secondary }]}>
                  <Feather name="image" size={10} color={colors.mutedForeground} />
                  <Text style={[styles.imagePillText, { color: colors.mutedForeground }]}>
                    {ch.imageCount}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {expanded && manga.chapters.length === 0 && (
        <View style={[styles.noChapters, { borderTopColor: colors.border }]}>
          <Text style={[styles.noChaptersText, { color: colors.mutedForeground }]}>
            لا توجد فصول مضافة بعد
          </Text>
        </View>
      )}
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
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14 },
  errorTitle: { fontSize: 17, fontWeight: "700" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  heroCard: { padding: 20, alignItems: "center", gap: 8, marginBottom: 8 },
  heroEmoji: { width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroEmojiText: { fontSize: 34 },
  heroName: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  heroDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  heroStats: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 4 },
  statItem: { alignItems: "center", gap: 2 },
  statNum: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 28 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  sectionCount: { fontSize: 13 },

  mangaList: { paddingHorizontal: 16, gap: 8 },
  mangaCard: { overflow: "hidden" },
  mangaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  mangaCover: { width: 52, height: 72, borderRadius: 6 },
  mangaCoverPlaceholder: { width: 52, height: 72, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  mangaInfo: { flex: 1, gap: 3 },
  mangaTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  mangaDesc: { fontSize: 12, lineHeight: 17 },
  mangaMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontWeight: "600" },
  localBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  localBadgeText: { fontSize: 10, fontWeight: "600" },
  mangaActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  readBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  chapterList: { borderTopWidth: StyleSheet.hairlineWidth },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chapterBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 38, alignItems: "center" },
  chapterBadgeText: { fontSize: 12, fontWeight: "700" },
  chapterTitle: { flex: 1, fontSize: 13 },
  imagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imagePillText: { fontSize: 10 },
  noChapters: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, alignItems: "center" },
  noChaptersText: { fontSize: 13 },
  emptyManga: { alignItems: "center", gap: 10, marginTop: 32, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
