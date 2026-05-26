import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MangaCard } from "@/components/MangaCard";
import { useColors } from "@/hooks/useColors";
import { type Manga } from "@/lib/mangadex";
import { browsePaginated } from "@/lib/mangadex";

const PAGE_SIZE = 20;

export default function BrowseScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [manga, setManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const fetching = useRef(false);

  const title =
    type === "popular" ? "الأكثر شعبية" : "المحدّثة مؤخراً";

  const fetchPage = useCallback(
    async (off: number) => {
      if (fetching.current) return;
      fetching.current = true;
      try {
        const data = await browsePaginated(type as "popular" | "recent", off, PAGE_SIZE);
        if (off === 0) {
          setManga(data);
        } else {
          setManga((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setOffset(off + data.length);
      } catch {
        // keep existing results
      } finally {
        fetching.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [type]
  );

  useEffect(() => {
    setManga([]);
    setOffset(0);
    setHasMore(true);
    setLoading(true);
    fetchPage(0);
  }, [fetchPage]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    fetchPage(offset);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderRadius: 20 }]}
          hitSlop={8}
        >
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={manga}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + 24 },
          ]}
          columnWrapperStyle={styles.row}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <MangaCard manga={item} width={110} height={158} />
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !hasMore && manga.length > 0 ? (
              <View style={styles.footerLoader}>
                <Text style={[styles.endText, { color: colors.mutedForeground }]}>
                  لا توجد نتائج أخرى
                </Text>
              </View>
            ) : null
          }
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
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    padding: 14,
    gap: 12,
  },
  row: {
    gap: 10,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  endText: {
    fontSize: 13,
  },
});
