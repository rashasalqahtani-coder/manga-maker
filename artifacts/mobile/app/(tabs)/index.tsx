"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StarzFeaturedBanner } from "@/components/StarzFeaturedBanner";
import { StarzMangaRow } from "@/components/StarzMangaRow";
import { useSource } from "@/context/SourceContext";
import { useColors } from "@/hooks/useColors";
import { fetchHomeMangas, fetchMostReadMangas, type UnifiedManga } from "@/lib/sources";
import { searchPublicTeams, type PublicTeam } from "@/lib/teams";

function navigateToManga(
  router: ReturnType<typeof useRouter>,
  manga: UnifiedManga
) {
  "use no memo";
  const titleE = encodeURIComponent(manga.title);
  const coverE = encodeURIComponent(manga.coverUrl);
  const ratingE = encodeURIComponent(manga.rating ?? "");
  const latestE = encodeURIComponent(manga.latestChapterNum ?? "");
  const genresE = encodeURIComponent(manga.genres.join(","));

  router.push({
    pathname: "/starz/[slug]" as any,
    params: {
      slug: manga.slug,
      title: titleE,
      coverUrl: coverE,
      rating: ratingE,
      latestChapter: latestE,
      genres: genresE,
      src: manga.sourceId,
    },
  });
}

function toStarzMangaShape(manga: UnifiedManga) {
  return {
    id: manga.id,
    slug: manga.slug,
    title: manga.title,
    coverUrl: manga.coverUrl,
    url: manga.url,
    latestChapters: manga.latestChapterNum
      ? [{ number: manga.latestChapterNum, url: manga.latestChapterUrl ?? "" }]
      : [],
    genres: manga.genres,
  };
}

export default function HomeScreen() {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { source } = useSource();

  const [manga, setManga] = useState<UnifiedManga[]>([]);
  const [mostRead, setMostRead] = useState<UnifiedManga[]>([]);
  const [publishedTeams, setPublishedTeams] = useState<PublicTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceError, setSourceError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const currentSource = useRef(source);
  currentSource.current = source;

  const loadData = useCallback(async () => {
    setLoading(true);
    setSourceError(false);
    const [homeResult, mostReadResult, teamsResult] = await Promise.allSettled([
      fetchHomeMangas(currentSource.current),
      fetchMostReadMangas(),
      searchPublicTeams(""),
    ]);
    setManga(homeResult.status === "fulfilled" ? homeResult.value : []);
    setMostRead(mostReadResult.status === "fulfilled" ? mostReadResult.value : []);
    setPublishedTeams(teamsResult.status === "fulfilled" ? teamsResult.value : []);
    setSourceError(
      homeResult.status === "rejected" ||
      mostReadResult.status === "rejected" ||
      teamsResult.status === "rejected",
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    setManga([]);
    loadData();
  }, [source, loadData]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  function handleRefreshBtn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpinning(true);
    loadData();
    setTimeout(() => setSpinning(false), 1000);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  const featured = manga.slice(0, 10);
  const trending = manga.slice(0, 12);
  const recent = manga.slice(manga.length > 12 ? 12 : 0);
  const teamUpdates = publishedTeams.flatMap((team) =>
    team.manga.map((item) => ({
      id: `team:${team.id}:${item.id}`,
      slug: item.id,
      title: item.title,
      coverUrl: item.coverUrl ?? "",
      url: "",
      latestChapters: item.chapters.length
        ? [{ number: item.chapters[0]?.number ?? "", url: "" }]
        : [],
      genres: [],
      teamId: team.id,
      mangaId: item.id,
    })),
  );
  const latestUpdates = [
    ...teamUpdates,
    ...recent.map((item) => ({ ...toStarzMangaShape(item), teamId: "", mangaId: "" })),
  ].slice(0, 12);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.appName, { color: colors.primary }]}>مانجا</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.searchBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/(tabs)/search");
                }}
              >
                <Feather name="search" size={16} color={colors.primary} />
                <Text style={[styles.searchBtnText, { color: colors.foreground }]}>
                  ابحث عن مانجا...
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.refreshBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={handleRefreshBtn}
                disabled={spinning}
              >
                {spinning ? (
                  <ActivityIndicator size={18} color={colors.primary} />
                ) : (
                  <Feather name="refresh-cw" size={18} color={colors.foreground} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Genres shortcut ── */}
        <Pressable
          style={({ pressed }) => [
            styles.sourceBanner,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              marginHorizontal: 16,
              marginBottom: 4,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/genres" as any);
          }}
        >
        {sourceError && !loading && (
          <Pressable
            style={[styles.errorBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => void loadData()}
          >
            <Feather name="alert-circle" size={16} color={colors.primary} />
            <Text style={[styles.errorBannerText, { color: colors.foreground }]}>
              تعذّر تحميل بعض بيانات الصفحة الرئيسية — اضغط للمحاولة مجدداً
            </Text>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
          </Pressable>
        )}
          <Feather name="grid" size={16} color={colors.primary} />
          <Text style={[styles.sourceBannerText, { color: colors.mutedForeground }]}>
            {"تصفّح المانجا حسب "}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              التصنيفات
            </Text>
          </Text>
          <View style={[styles.arBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.arBadgeText, { color: colors.primary }]}>عرض الكل</Text>
          </View>
          <Feather name="chevron-left" size={12} color={colors.mutedForeground} />
        </Pressable>

        {/* ── Featured banner ── */}
        <StarzFeaturedBanner
          manga={featured.map(toStarzMangaShape) as any}
          loading={loading}
          onPressManga={(m) => {
            const u = manga.find((x) => x.id === m.id || x.slug === m.slug);
            if (u) navigateToManga(router, u);
          }}
        />

        {/* ── Trending ── */}
        <StarzMangaRow
          title="الرائج الآن"
          manga={trending.map(toStarzMangaShape) as any}
          loading={loading}
          error={sourceError && !loading && trending.length === 0}
          onPressManga={(m) => {
            const u = manga.find((x) => x.id === m.id || x.slug === m.slug);
            if (u) navigateToManga(router, u);
          }}
        />

        <StarzMangaRow
          title="الأكثر قراءة"
          manga={mostRead.map(toStarzMangaShape) as any}
          loading={loading}
          error={sourceError && !loading && mostRead.length === 0}
          onPressManga={(m) => {
            const u = mostRead.find((x) => x.id === m.id || x.slug === m.slug);
            if (u) navigateToManga(router, u);
          }}
        />

        {/* ── Recently updated ── */}
        {latestUpdates.length > 0 && (
          <StarzMangaRow
            title="آخر التحديثات"
            manga={latestUpdates as any}
            loading={loading}
            onPressManga={(m) => {
              const teamItem = latestUpdates.find((item) => item.id === m.id);
              if (teamItem?.teamId) {
                router.push(
                  `/teams/${encodeURIComponent(teamItem.teamId)}/manga/${encodeURIComponent(teamItem.mangaId)}` as any,
                );
                return;
              }
              const u = manga.find((x) => x.id === m.id || x.slug === m.slug);
              if (u) navigateToManga(router, u);
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 12, textAlign: "right", lineHeight: 18 },
  header: { paddingHorizontal: 16, marginBottom: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: 1 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    flex: 1,
    maxWidth: 200,
  },
  searchBtnText: { fontSize: 13, opacity: 0.5 },
  refreshBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sourceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  sourceFlag: { fontSize: 14 },
  sourceBannerText: { fontSize: 12, flex: 1 },
  arBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  arBadgeText: { fontSize: 10, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 360,
    padding: 16,
    gap: 2,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  modalDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  sourceName: { fontSize: 15, writingDirection: "rtl" },
  sourceDesc: { fontSize: 11, marginTop: 2, writingDirection: "rtl" },
});
