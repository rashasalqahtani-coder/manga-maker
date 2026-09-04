import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useReaderSettings } from "@/context/ReaderSettingsContext";
import { getComickChapterPages, type ComickChapterImage } from "@/lib/comick";

const { width: SCREEN_W } = Dimensions.get("window");

export default function ComickReaderScreen() {
  const { hid } = useLocalSearchParams<{ hid: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useReaderSettings();

  const [pages, setPages]           = useState<ComickChapterImage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showUI, setShowUI]         = useState(true);

  const flatRef = useRef<FlatList>(null);
  const uiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hid) return;
    getComickChapterPages(hid)
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [hid]);

  const showUITemporarily = () => {
    setShowUI(true);
    if (uiTimer.current) clearTimeout(uiTimer.current);
    uiTimer.current = setTimeout(() => setShowUI(false), 3000);
  };

  const goToPage = (index: number) => {
    const targetIndex = Math.max(0, Math.min(pages.length - 1, index));
    flatRef.current?.scrollToIndex({ index: targetIndex, animated: true });
    setCurrentPage(targetIndex);
    showUITemporarily();
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: "#000" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadText, { color: "#fff" }]}>جار تحميل الفصل...</Text>
      </View>
    );
  }

  if (pages.length === 0) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: "#000" }]}>
        <Feather name="alert-circle" size={40} color="#666" />
        <Text style={[styles.loadText, { color: "#aaa" }]}>تعذّر تحميل الصفحات</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: "#fff" }}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const renderPage = ({ item, index }: { item: ComickChapterImage; index: number }) => {
    const imgW = item.w ?? SCREEN_W;
    const imgH = item.h ?? Math.round(SCREEN_W * 1.4);
    const aspectRatio = imgW / imgH;
    const displayH = mode === "scroll"
      ? Math.round(SCREEN_W / aspectRatio)
      : Dimensions.get("window").height;

    return (
      <Pressable onPress={showUITemporarily}>
        <Image
          source={{ uri: item.url }}
          style={{ width: SCREEN_W, height: displayH }}
          contentFit={mode === "scroll" ? "contain" : "contain"}
          transition={200}
          recyclingKey={`page-${index}`}
        />
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <FlatList
        ref={flatRef}
        data={pages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderPage}
        horizontal={mode !== "scroll"}
        pagingEnabled={mode !== "scroll"}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems[0]) setCurrentPage(viewableItems[0].index ?? 0);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
      />

      {/* Top bar */}
      {showUI && (
        <>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} style={styles.uiBtn} hitSlop={8}>
              <Feather name="arrow-right" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.pageIndicator}>
              {currentPage + 1} / {pages.length}
            </Text>
            <View style={[styles.sourcePill, { backgroundColor: "#0EA5E9" + "33" }]}>
              <Text style={[styles.sourcePillText, { color: "#0EA5E9" }]}>ComicK</Text>
            </View>
          </View>
          <View pointerEvents="box-none" style={styles.pageNavigation}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الصفحة السابقة"
              disabled={currentPage === 0}
              onPress={() => goToPage(currentPage - 1)}
              style={({ pressed }) => [
                styles.pageNavButton,
                { opacity: currentPage === 0 ? 0.25 : pressed ? 0.65 : 1 },
              ]}
            >
              <Feather name="chevron-left" size={30} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الصفحة التالية"
              disabled={currentPage >= pages.length - 1}
              onPress={() => goToPage(currentPage + 1)}
              style={({ pressed }) => [
                styles.pageNavButton,
                { opacity: currentPage >= pages.length - 1 ? 0.25 : pressed ? 0.65 : 1 },
              ]}
            >
              <Feather name="chevron-right" size={30} color="#fff" />
            </Pressable>
          </View>
        </>
      )}

      {/* Bottom page indicator */}
      {showUI && mode !== "scroll" && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.dotRow}>
            {pages.slice(0, 20).map((_, i) => (
              <Pressable
                key={i}
                onPress={() => flatRef.current?.scrollToIndex({ index: i, animated: true })}
                style={[
                  styles.dot,
                  { backgroundColor: i === currentPage ? colors.primary : "#ffffff44" },
                ]}
              />
            ))}
            {pages.length > 20 && (
              <Text style={styles.moreDots}>+{pages.length - 20}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  loadText: { fontSize: 14 },
  backBtn: { backgroundColor: "#333", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#000000cc",
    gap: 12,
  },
  uiBtn: {},
  pageNavigation: {
    position: "absolute", top: "46%", left: 12, right: 12,
    flexDirection: "row", justifyContent: "space-between",
  },
  pageNavButton: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  pageIndicator: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" },
  sourcePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sourcePillText: { fontSize: 11, fontWeight: "700" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#000000cc",
    paddingTop: 12,
    alignItems: "center",
  },
  dotRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  moreDots: { color: "#fff", fontSize: 11, marginLeft: 4 },
});
