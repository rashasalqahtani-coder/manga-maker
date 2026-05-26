import React, { useEffect, useState } from "react";
import {
  Platform,
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

  const [popular, setPopular] = useState<Manga[]>([]);
  const [recent, setRecent] = useState<Manga[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [errorPopular, setErrorPopular] = useState(false);
  const [errorRecent, setErrorRecent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const topPad =
    Platform.OS === "web"
      ? 67
      : insets.top + 12;

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
          <Text style={[styles.appName, { color: colors.primary }]}>
            MANGA
          </Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
            読む
          </Text>
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
});
