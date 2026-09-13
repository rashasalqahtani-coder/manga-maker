"use no memo";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image as RNImage,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { addToHistory } from "@/app/(tabs)/history";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useColors } from "@/hooks/useColors";
import { getLocalPages } from "@/lib/download";
import { getChapterPages, getMangaChapters, type Chapter, type ChapterPages } from "@/lib/mangadex";
import { getReaderHref } from "@/lib/readerNavigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PageItem {
  uri: string;
  index: number;
}

export default function ReaderScreen() {
  "use no memo";
  const { chapterId, externalUrl, mangaId, mangaTitle, coverUrl, chapterNum } =
    useLocalSearchParams<{
      chapterId: string;
      externalUrl?: string;
      mangaId?: string;
      mangaTitle?: string;
      coverUrl?: string;
      chapterNum?: string;
    }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const flatListRef = useRef<FlatList<PageItem>>(null);

  // Fetch sibling chapters for next/prev navigation
  useEffect(() => {
    if (!mangaId) return;
    getMangaChapters(mangaId).then((list) => {
      // Keep only readable chapters (have pages and no external redirect)
      setChapters(list.filter((c) => c.attributes.pages > 0 && !c.attributes.externalUrl));
    }).catch(() => { /* navigation optional */ });
  }, [mangaId]);

  // Chapters arrive sorted desc (highest first). Find neighbours.
  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const nextChapter  = currentIdx > 0 ? chapters[currentIdx - 1] : null;   // higher number
  const prevChapter  = currentIdx >= 0 && currentIdx < chapters.length - 1
    ? chapters[currentIdx + 1]   // lower number
    : null;

  const goToChapter = (ch: Chapter) => {
    router.replace(
      getReaderHref({
        chapterId: ch.id,
        mangaId,
        mangaTitle,
        coverUrl,
        chapterNum: ch.attributes.chapter ?? "",
      }),
    );
  };

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(false);
    setIsEmpty(false);
    setCurrentPage(1);

    // Try local pages first (wrapped in try-catch for native safety)
    try {
      const localPages = await getLocalPages(chapterId);
      if (localPages.length > 0) {
        setIsOffline(true);
        setPages(localPages.map((uri, i) => ({ uri, index: i })));
        setLoading(false);
        if (mangaId && mangaTitle) {
          addToHistory({
            mangaId,
            mangaTitle,
            coverUrl: coverUrl || null,
            chapterId,
            chapterNum: chapterNum || null,
            readAt: Date.now(),
          });
        }
        return;
      }
    } catch {
      // Local pages unavailable — fall through to network
    }

    // Fetch from network
    try {
      const info: ChapterPages = await getChapterPages(chapterId);
      if (!info.data || info.data.length === 0) {
        setIsEmpty(true);
        setLoading(false);
        return;
      }
      setIsOffline(false);
      setPages(
        info.data.map((filename, i) => ({
          uri: `${info.baseUrl}/data/${info.hash}/${filename}`,
          index: i,
        }))
      );
      if (mangaId && mangaTitle) {
        addToHistory({
          mangaId,
          mangaTitle,
          coverUrl: coverUrl || null,
          chapterId,
          chapterNum: chapterNum || null,
          readAt: Date.now(),
        });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [chapterId, chapterNum, coverUrl, mangaId, mangaTitle]);

  useEffect(() => {
    void loadChapter();
  }, [loadChapter]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: unknown }> }) => {
      if (viewableItems.length > 0) {
        const idx = viewableItems[0].item as PageItem;
        setCurrentPage(idx.index + 1);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

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

  if (isEmpty) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <Feather name="external-link" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          فصل خارجي
        </Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          هذا الفصل مستضاف على موقع خارجي
        </Text>
        <View style={styles.btnRow}>
          {externalUrl ? (
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={() => Linking.openURL(externalUrl)}
            >
              <Feather name="external-link" size={16} color="#fff" />
              <Text style={styles.retryText}>فتح في المتصفح</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.retryText, { color: colors.foreground }]}>رجوع</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (error || pages.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          تعذّر تحميل الفصل
        </Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          تحقق من اتصالك بالإنترنت وأعد المحاولة
        </Text>
        <View style={styles.btnRow}>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => void loadChapter()}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.retryText, { color: colors.foreground }]}>رجوع</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <FlatList
        key={chapterId}
        ref={flatListRef}
        data={pages}
        keyExtractor={(item) => String(item.index)}
        scrollEnabled
        nestedScrollEnabled
        removeClippedSubviews={false}
        initialNumToRender={3}
        windowSize={7}
        renderItem={({ item }) => (
          <Pressable onPress={() => setShowControls((v) => !v)}>
            <PageImage uri={item.uri} />
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          flatListRef.current?.scrollToOffset({
            offset: Math.max(0, index * averageItemLength),
            animated: true,
          });
        }}
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
            <Pressable
              onPress={() => { setShowComments(true); }}
              hitSlop={10}
              style={styles.commentBtn}
            >
              <Feather name="message-circle" size={22} color="#fff" />
            </Pressable>
          </View>

          <View pointerEvents="box-none" style={styles.pageNavigation}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الفصل السابق"
              disabled={!prevChapter}
              onPress={() => prevChapter && goToChapter(prevChapter)}
              style={({ pressed }) => [
                styles.pageNavButton,
                { opacity: !prevChapter ? 0.25 : pressed ? 0.65 : 1 },
              ]}
            >
              <Feather name="chevron-left" size={30} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الفصل التالي"
              disabled={!nextChapter}
              onPress={() => nextChapter && goToChapter(nextChapter)}
              style={({ pressed }) => [
                styles.pageNavButton,
                { opacity: !nextChapter ? 0.25 : pressed ? 0.65 : 1 },
              ]}
            >
              <Feather name="chevron-right" size={30} color="#fff" />
            </Pressable>
          </View>

          <View
            style={[
              styles.bottomBar,
              { paddingBottom: insets.bottom + 8, backgroundColor: "rgba(0,0,0,0.7)" },
            ]}
          >
            {/* Chapter navigation */}
            {chapters.length > 0 ? (
              <View style={styles.navRow}>
                {/* Next chapter = higher number (index-1 in desc list) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.navBtn,
                    { opacity: nextChapter && !pressed ? 1 : 0.35 },
                  ]}
                  onPress={() => nextChapter && goToChapter(nextChapter)}
                  disabled={!nextChapter}
                  hitSlop={8}
                >
                  <Feather name="chevron-right" size={18} color="#fff" />
                  <View style={styles.navBtnInfo}>
                    <Text style={styles.navBtnLabel}>الفصل التالي</Text>
                    {nextChapter && (
                      <Text style={styles.navBtnNum}>
                        {nextChapter.attributes.chapter ?? ""}
                      </Text>
                    )}
                  </View>
                </Pressable>

                <Text style={styles.navDivider}>|</Text>

                {/* Prev chapter = lower number (index+1 in desc list) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.navBtn,
                    styles.navBtnReverse,
                    { opacity: prevChapter && !pressed ? 1 : 0.35 },
                  ]}
                  onPress={() => prevChapter && goToChapter(prevChapter)}
                  disabled={!prevChapter}
                  hitSlop={8}
                >
                  <View style={[styles.navBtnInfo, { alignItems: "flex-end" }]}>
                    <Text style={styles.navBtnLabel}>الفصل السابق</Text>
                    {prevChapter && (
                      <Text style={styles.navBtnNum}>
                        {prevChapter.attributes.chapter ?? ""}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-left" size={18} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Text style={styles.bottomText}>اضغط لإظهار أو إخفاء التحكم</Text>
            )}
          </View>
        </>
      )}

      <CommentsSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        entityType="chapter"
        entityId={chapterId ?? ""}
        title={`تعليقات الفصل ${chapterNum ?? ""}`}
      />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  errorText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
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
  commentBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pageNavigation: {
    position: "absolute",
    top: "46%",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  navBtnReverse: {
    justifyContent: "flex-end",
  },
  navBtnInfo: { gap: 1 },
  navBtnLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "500" },
  navBtnNum: { color: "#fff", fontSize: 13, fontWeight: "700" },
  navDivider: { color: "rgba(255,255,255,0.2)", fontSize: 18, marginHorizontal: 8 },
});
