import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchMangasByGenre, type UnifiedManga } from "@/lib/sources";
import { fetchTeamMangasByGenre, type TeamMangaResult } from "@/lib/teams";

type GenreResult =
  | { source: "rorym"; manga: UnifiedManga }
  | { source: "team"; manga: TeamMangaResult };

export default function GenreMangaScreen() {
  const params = useLocalSearchParams<{ name: string }>();
  const genre = decodeURIComponent(params.name ?? "");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [manga, setManga] = useState<GenreResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!genre) return;
    setLoading(true);
    setError(false);
    Promise.all([fetchMangasByGenre(genre), fetchTeamMangasByGenre(genre)])
      .then(([rorymManga, teamManga]) =>
        setManga([
          ...rorymManga.map((item) => ({ source: "rorym" as const, manga: item })),
          ...teamManga.map((item) => ({ source: "team" as const, manga: item })),
        ])
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [genre]);

  useEffect(() => {
    load();
  }, [load]);

  const gap = 12;
  const cardWidth = Math.floor((width - 32 - gap * 2) / 3);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card }]}
        >
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>التصنيف</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{genre}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={34} color={colors.mutedForeground} />
          <Text style={[styles.message, { color: colors.mutedForeground }]}>تعذر تحميل الأعمال</Text>
          <Pressable style={[styles.retry, { backgroundColor: colors.primary }]} onPress={load}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={manga}
          keyExtractor={(item) =>
            item.source === "rorym"
              ? `rorym:${item.manga.id}`
              : `team:${item.manga.teamId}:${item.manga.mangaId}`
          }
          numColumns={3}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + 24 },
            manga.length === 0 && styles.emptyGrid,
          ]}
          columnWrapperStyle={manga.length > 0 ? styles.row : undefined}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="book-open" size={38} color={colors.muted} />
              <Text style={[styles.message, { color: colors.mutedForeground }]}>
                لا توجد مانجا ضمن هذا التصنيف حالياً
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const coverUrl = item.manga.coverUrl ?? "";
            const title = item.manga.title;
            const isTeamManga = item.source === "team";

            return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth, opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => {
                if (isTeamManga) {
                  router.push(`/teams/${item.manga.teamId}/manga/${item.manga.mangaId}` as any);
                  return;
                }
                router.push({
                  pathname: "/starz/[slug]" as any,
                  params: {
                    slug: item.manga.slug,
                    title: encodeURIComponent(item.manga.title),
                    coverUrl: encodeURIComponent(item.manga.coverUrl),
                    genres: encodeURIComponent(item.manga.genres.join(",")),
                    latestChapter: encodeURIComponent(item.manga.latestChapterNum ?? ""),
                    src: "rorym",
                  },
                });
              }}
            >
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={[styles.cover, { backgroundColor: colors.card }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.card }]}>
                  <Feather name="book" size={24} color={colors.mutedForeground} />
                </View>
              )}
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                {title}
              </Text>
            </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { flex: 1, alignItems: "center" },
  eyebrow: { fontSize: 11 },
  title: { fontSize: 18, fontWeight: "800" },
  headerSpacer: { width: 38 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  message: { fontSize: 14, textAlign: "center" },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: "#fff", fontWeight: "700" },
  grid: { padding: 16 },
  emptyGrid: { flexGrow: 1 },
  row: { gap: 12, marginBottom: 18 },
  card: { gap: 7 },
  cover: { width: "100%", aspectRatio: 2 / 3, borderRadius: 10 },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 12, lineHeight: 17, fontWeight: "700", textAlign: "right" },
});