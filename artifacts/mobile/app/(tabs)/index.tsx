"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { FeaturedBanner } from "@/components/FeaturedBanner";
import { MangaRow } from "@/components/MangaRow";
import { useColors } from "@/hooks/useColors";
import {
  getArabicManhua,
  getArabicManhwa,
  getNewArabic,
  getPopularManga,
  getRecentlyUpdated,
  getTopRatedManga,
  type Manga,
} from "@/lib/mangadex";

export default function HomeScreen() {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [topRated,    setTopRated]    = useState<Manga[]>([]);
  const [popular,     setPopular]     = useState<Manga[]>([]);
  const [recent,      setRecent]      = useState<Manga[]>([]);
  const [manhwa,      setManhwa]      = useState<Manga[]>([]);
  const [manhua,      setManhua]      = useState<Manga[]>([]);
  const [newArabic,   setNewArabic]   = useState<Manga[]>([]);

  const [topLoading,       setTopLoading]       = useState(true);
  const [popularLoading,   setPopularLoading]   = useState(true);
  const [recentLoading,    setRecentLoading]    = useState(true);
  const [manhwaLoading,    setManhwaLoading]    = useState(true);
  const [manhuaLoading,    setManhuaLoading]    = useState(true);
  const [newArabicLoading, setNewArabicLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [spinning,   setSpinning]   = useState(false);

  function loadData() {
    setTopLoading(true);
    getTopRatedManga()
      .then((d) => setTopRated(d))
      .catch(() => setTopRated([]))
      .finally(() => setTopLoading(false));

    setPopularLoading(true);
    getPopularManga()
      .then((d) => setPopular(d))
      .catch(() => setPopular([]))
      .finally(() => setPopularLoading(false));

    setRecentLoading(true);
    getRecentlyUpdated()
      .then((d) => setRecent(d))
      .catch(() => setRecent([]))
      .finally(() => setRecentLoading(false));

    setManhwaLoading(true);
    getArabicManhwa()
      .then((d) => setManhwa(d))
      .catch(() => setManhwa([]))
      .finally(() => setManhwaLoading(false));

    setManhuaLoading(true);
    getArabicManhua()
      .then((d) => setManhua(d))
      .catch(() => setManhua([]))
      .finally(() => setManhuaLoading(false));

    setNewArabicLoading(true);
    getNewArabic()
      .then((d) => setNewArabic(d))
      .catch(() => setNewArabic([]))
      .finally(() => setNewArabicLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  }

  function handleRefreshBtn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpinning(true);
    loadData();
    setTimeout(() => setSpinning(false), 1000);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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

        {/* ── Source badge ── */}
        <View
          style={[
            styles.sourceBanner,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              marginHorizontal: 16,
              marginBottom: 4,
            },
          ]}
        >
          <Feather name="globe" size={13} color={colors.primary} />
          <Text style={[styles.sourceBannerText, { color: colors.mutedForeground }]}>
            {"مصدر المحتوى العربي: "}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>MangaDex</Text>
          </Text>
          <View style={[styles.arBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.arBadgeText, { color: colors.primary }]}>عربي</Text>
          </View>
        </View>

        {/* ── Featured banner ── */}
        <FeaturedBanner manga={topRated} loading={topLoading} error={false} />

        {/* ── Sections ── */}
        <MangaRow
          title="الأكثر شعبية"
          manga={popular}
          loading={popularLoading}
          error={false}
          onMorePress={() => router.push("/browse/popular" as any)}
        />
        <MangaRow
          title="محدّثة مؤخراً"
          manga={recent}
          loading={recentLoading}
          error={false}
          onMorePress={() => router.push("/browse/recent" as any)}
        />
        <MangaRow
          title="مانهوا كورية 🇰🇷"
          manga={manhwa}
          loading={manhwaLoading}
          error={false}
        />
        <MangaRow
          title="مانهوا صينية 🇨🇳"
          manga={manhua}
          loading={manhuaLoading}
          error={false}
        />
        <MangaRow
          title="أحدث الإضافات عربياً"
          manga={newArabic}
          loading={newArabicLoading}
          error={false}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  sourceBannerText: { fontSize: 12, flex: 1 },
  arBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  arBadgeText: { fontSize: 10, fontWeight: "700" },
});
