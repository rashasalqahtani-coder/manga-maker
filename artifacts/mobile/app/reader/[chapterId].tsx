import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getLocalPages } from "@/lib/download";
import { getChapterPages, type ChapterPages } from "@/lib/mangadex";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PageItem {
  uri: string;
  index: number;
}

export default function ReaderScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setError(false);

    const load = async () => {
      // Try local pages first
      const localPages = await getLocalPages(chapterId);
      if (localPages.length > 0) {
        setIsOffline(true);
        setPages(localPages.map((uri, i) => ({ uri, index: i })));
        setLoading(false);
        return;
      }

      // Fall back to network
      try {
        const info: ChapterPages = await getChapterPages(chapterId);
        setPages(
          info.data.map((filename, i) => ({
            uri: `${info.baseUrl}/data/${info.hash}/${filename}`,
            index: i,
          }))
        );
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [chapterId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          جارٍ تحميل الفصل...
        </Text>
      </View>
    );
  }

  if (error || pages.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          تعذّر تحميل الفصل
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <FlatList
        data={pages}
        keyExtractor={(item) => String(item.index)}
        renderItem={({ item }) => (
          <Pressable onPress={() => setShowControls((v) => !v)}>
            <PageImage uri={item.uri} />
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0) {
            const idx = viewableItems[0].item as PageItem;
            setCurrentPage(idx.index + 1);
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {showControls && (
        <>
          <View
            style={[
              styles.topBar,
              { paddingTop: insets.top + 8, backgroundColor: "rgba(0,0,0,0.7)" },
            ]}
          >
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Feather name="chevron-left" size={26} color="#fff" />
            </Pressable>
            <View style={styles.centerInfo}>
              <Text style={styles.pageCount}>
                {currentPage} / {pages.length}
              </Text>
              {isOffline && (
                <View style={styles.offlinePill}>
                  <Feather name="wifi-off" size={10} color="#fff" />
                  <Text style={styles.offlinePillText}>غير متصل</Text>
                </View>
              )}
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View
            style={[
              styles.bottomBar,
              { paddingBottom: insets.bottom + 8, backgroundColor: "rgba(0,0,0,0.7)" },
            ]}
          >
            <Text style={styles.bottomText}>اضغط لإظهار أو إخفاء التحكم</Text>
          </View>
        </>
      )}
    </View>
  );
}

function PageImage({ uri }: { uri: string }) {
  const [height, setHeight] = useState(SCREEN_WIDTH * 1.45);

  useEffect(() => {
    RNImage.getSize(
      uri,
      (w, h) => setHeight(SCREEN_WIDTH * (h / w)),
      () => {}
    );
  }, [uri]);

  return (
    <RNImage
      source={{ uri }}
      style={{ width: SCREEN_WIDTH, height }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "600" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  centerInfo: { alignItems: "center", gap: 4 },
  pageCount: { color: "#fff", fontSize: 14, fontWeight: "600" },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232,64,64,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  offlinePillText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 12,
  },
  bottomText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
});
