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

export default function TeamDetailScreen() {
  "use no memo";
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const topPad = Platform.OS === "web" ? 20 : insets.top + 16;

  const openManga = useCallback((manga: PublicTeamManga) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/teams/${id}/manga/${manga.id}` as any);
  }, [id, router]);

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
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>جارٍ تحميل الفريق...</Text>
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
          <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={load}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {team.emoji} {team.name}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <View style={[styles.heroEmoji, { backgroundColor: colors.primary + "18" }]}>
            <Text style={styles.heroEmojiText}>{team.emoji}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{team.name}</Text>
          {!!team.description && (
            <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>{team.description}</Text>
          )}
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

        {/* Manga list header */}
        {team.manga.length > 0 && (
          <View style={styles.sectionHeader}>
            <Feather name="book-open" size={14} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أعمال الفريق</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{team.manga.length}</Text>
          </View>
        )}

        {/* Manga list */}
        <View style={styles.mangaList}>
          {team.manga.map((manga) => (
            <MangaRow key={manga.id} manga={manga} teamId={id ?? ""} onPress={() => openManga(manga)} />
          ))}
        </View>

        {team.manga.length === 0 && (
          <View style={styles.emptyManga}>
            <Feather name="book" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لم يُضف الفريق أي أعمال بعد</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MangaRow({ manga, teamId, onPress }: { manga: PublicTeamManga; teamId: string; onPress: () => void }) {
  const colors = useColors();
  const router = useRouter();
  const isMangaDex = MANGADEX_ID_RE.test(manga.id);
  const firstReadable = manga.chapters.find((ch) => MANGADEX_ID_RE.test(ch.id)) ?? null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.mangaCard,
        { backgroundColor: colors.card, borderRadius: colors.radius, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      {manga.coverUrl ? (
        <Image source={{ uri: manga.coverUrl }} style={styles.mangaCover} contentFit="cover" />
      ) : (
        <View style={[styles.mangaCoverPlaceholder, { backgroundColor: colors.secondary }]}>
          <Feather name="book" size={16} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.mangaInfo}>
        <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={2}>{manga.title}</Text>
        {!!manga.description && (
          <Text style={[styles.mangaDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{manga.description}</Text>
        )}
        <View style={styles.mangaMeta}>
          <View style={styles.metaItem}>
            <Feather name="layers" size={11} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>
              {manga.chapters.length} {manga.chapters.length === 1 ? "فصل" : "فصول"}
            </Text>
          </View>
          {!isMangaDex && (
            <View style={[styles.localBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.localBadgeText, { color: colors.mutedForeground }]}>محلي</Text>
            </View>
          )}
        </View>
        {firstReadable && (
          <Pressable
            style={({ pressed }) => [
              styles.readBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: "/reader/[chapterId]" as any,
                params: {
                  chapterId: firstReadable.id,
                  mangaId: manga.id,
                  mangaTitle: manga.title,
                  coverUrl: manga.coverUrl ?? "",
                  chapterNum: firstReadable.number,
                },
              });
            }}
          >
            <Feather name="play" size={12} color="#fff" />
            <Text style={styles.readBtnText}>ابدأ القراءة</Text>
          </Pressable>
        )}
      </View>
      <Feather name="chevron-left" size={17} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
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

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  sectionCount: { fontSize: 13 },

  mangaList: { paddingHorizontal: 16, gap: 8 },
  mangaCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, overflow: "hidden" },
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
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  readBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  emptyManga: { alignItems: "center", gap: 10, marginTop: 32, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
