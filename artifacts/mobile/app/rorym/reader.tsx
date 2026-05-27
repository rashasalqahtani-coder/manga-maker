"use no memo";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

const API_BASE =
  typeof process !== "undefined" && process.env["EXPO_PUBLIC_DOMAIN"]
    ? `https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api`
    : "/api";

const { width: SCREEN_W } = Dimensions.get("window");

export default function RorymReaderScreen() {
  "use no memo";
  const params = useLocalSearchParams<{
    slug: string;
    chapterNum: string;
    title?: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [barsVisible, setBarsVisible] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const mangaTitle = params.title ? decodeURIComponent(params.title) : "";
  const chapterNum = params.chapterNum ?? "";
  const slug = params.slug ?? "";

  useEffect(() => {
    if (!slug || !chapterNum) return;
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/rorym/manga/${encodeURIComponent(slug)}/chapters`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ chapters: { number: string; pages: string[] }[] }>;
      })
      .then((d) => {
        const ch = d.chapters.find((c) => c.number === chapterNum);
        if (ch && ch.pages.length > 0) {
          setPages(ch.pages);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug, chapterNum]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentPage(viewableItems[0].index + 1);
      }
    },
    []
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>جارٍ التحميل...</Text>
      </View>
    );
  }

  if (error || pages.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>تعذّر تحميل الفصل</Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <Pressable onPress={() => setBarsVisible((v) => !v)}>
            <Image
              source={{ uri: item }}
              style={styles.page}
              contentFit="contain"
              transition={200}
            />
          </Pressable>
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        showsVerticalScrollIndicator={false}
      />

      {/* Top bar */}
      {barsVisible && (
        <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: "rgba(0,0,0,0.75)" }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backIconBtn}>
            <Feather name="arrow-right" size={22} color="#fff" />
          </Pressable>
          <View style={styles.topBarCenter}>
            {mangaTitle ? (
              <Text style={styles.topTitle} numberOfLines={1}>{mangaTitle}</Text>
            ) : null}
            <Text style={styles.topChapter}>فصل {chapterNum}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      )}

      {/* Page counter */}
      {barsVisible && pages.length > 0 && (
        <View style={[styles.pageCounter, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.pageCounterText}>
            {currentPage} / {pages.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  hint: { fontSize: 15 },
  page: { width: SCREEN_W, height: SCREEN_W * 1.45 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backIconBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  topBarCenter: { flex: 1, alignItems: "center" },
  topTitle: { color: "#fff", fontSize: 13, opacity: 0.8 },
  topChapter: { color: "#fff", fontSize: 15, fontWeight: "600" },
  pageCounter: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  pageCounterText: { color: "#fff", fontSize: 13 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  backBtnText: { color: "#fff", fontWeight: "600" },
});
