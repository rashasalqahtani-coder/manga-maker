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

import { MangaRow } from "@/components/MangaRow";
import { useColors } from "@/hooks/useColors";
import {
  getPopularManga,
  getRecentlyUpdated,
  type Manga,
} from "@/lib/mangadex";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [popular, setPopular] = useState<Manga[]>([]);
  const [recent, setRecent] = useState<Manga[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [errorPopular, setErrorPopular] = useState(false);
  const [errorRecent, setErrorRecent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const fetchAll = async () => {
    setErrorPopular(false);
    setErrorRecent(false);
    setLoadingPopular(true);
    setLoadingRecent(true);

    getPopularManga()
      .then(setPopular)
      .catch(() => setErrorPopular(true))
      .finally(() => setLoadingPopular(false));

    getRecentlyUpdated()
      .then(setRecent)
      .catch(() => setErrorRecent(true))
      .finally(() => setLoadingRecent(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleRefreshBtn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpinning(true);
    await fetchAll();
    setSpinning(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.appName, { color: colors.primary }]}>
                MANGA
              </Text>
              <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
                読む
              </Text>
            </View>

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
                  Search manga...
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

        <MangaRow
          title="Popular"
          manga={popular}
          loading={loadingPopular}
          error={errorPopular}
        />
        <MangaRow
          title="Recently Updated"
          manga={recent}
          loading={loadingRecent}
          error={errorRecent}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 4,
  },
  appSub: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 2,
    marginTop: 2,
  },
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
  searchBtnText: {
    fontSize: 13,
    fontWeight: "400",
    opacity: 0.5,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
