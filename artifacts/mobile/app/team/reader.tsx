"use no memo";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image as RNImage,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTeam } from "@/context/TeamContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PageItem {
  uri: string;
  index: number;
}

interface ReaderChapter {
  id: string;
  number: string;
  imageUrls?: string[];
  imageUris?: string[];
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

export default function TeamReaderScreen() {
  "use no memo";
  const { mangaId, chapterId, imageUrlsJson, chaptersJson } = useLocalSearchParams<{
    mangaId: string;
    chapterId: string;
    imageUrlsJson?: string;
    chaptersJson?: string;
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { team } = useTeam();

  const [pages, setPages] = useState<PageItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const flatListRef = useRef<FlatList<PageItem>>(null);

  const manga = team?.manga.find((m) => m.id === mangaId);
  const routeChapters: ReaderChapter[] = chaptersJson
    ? (() => {
        try {
          return JSON.parse(chaptersJson) as ReaderChapter[];
        } catch {
          return [];
        }
      })()
    : [];
  const chaptersForReader = (manga?.chapters ?? routeChapters) as ReaderChapter[];
  const chapter = chaptersForReader.find((c) => c.id === chapterId);
  const orderedChapters = [...chaptersForReader].sort((a, b) =>
    b.number.localeCompare(a.number, undefined, { numeric: true }),
  );
  const currentChapterIndex = orderedChapters.findIndex((c) => c.id === chapterId);
  const nextChapter =
    currentChapterIndex > 0 ? orderedChapters[currentChapterIndex - 1] : null;
  const previousChapter =
    currentChapterIndex >= 0 && currentChapterIndex < orderedChapters.length - 1
      ? orderedChapters[currentChapterIndex + 1]
      : null;

  // Resolve image URIs: local context first, then remote URLs passed as param
  const remoteUrls: string[] | null = imageUrlsJson
    ? (() => { try { return JSON.parse(imageUrlsJson) as string[]; } catch { return null; } })()
    : null;
  const resolvedUris = chapter?.imageUris ?? chapter?.imageUrls ?? remoteUrls;

  useEffect(() => {
    if (!resolvedUris || resolvedUris.length === 0) return;
    setPages(resolvedUris.map((uri, i) => ({ uri, index: i })));
    setCurrentPage(1);
  }, [JSON.stringify(resolvedUris)]);

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

  const goToChapter = (targetChapter: ReaderChapter) => {
    const imageUrls = targetChapter.imageUris ?? targetChapter.imageUrls;
    router.replace({
      pathname: "/team/reader",
      params: {
        mangaId,
        chapterId: targetChapter.id,
        imageUrlsJson: imageUrls?.length ? JSON.stringify(imageUrls) : undefined,
        chaptersJson: JSON.stringify(chaptersForReader),
      },
    } as never);
  };

  if (!chapter && !remoteUrls) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          الفصل غير موجود
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.btnText, { color: colors.foreground }]}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  if (!resolvedUris || resolvedUris.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <Feather name="image" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          لا توجد صور لهذا الفصل
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          أضف صور الفصل من شاشة الفريق
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.btnText, { color: colors.foreground }]}>رجوع</Text>
        </Pressable>
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
              { paddingTop: insets.top + 8, backgroundColor: "rgba(0,0,0,0.75)" },
            ]}
          >
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Feather name="chevron-left" size={26} color="#fff" />
            </Pressable>
            <View style={styles.centerInfo}>
              <Text style={styles.chapterLabel} numberOfLines={1}>
                {manga?.title} — فصل {chapter?.number}
              </Text>
              <Text style={styles.pageCount}>
                {currentPage} / {pages.length}
              </Text>
              <View style={styles.teamPill}>
                <Feather name="users" size={10} color="#fff" />
                <Text style={styles.teamPillText}>مانجا الفريق</Text>
              </View>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View pointerEvents="box-none" style={styles.pageNavigation}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الفصل السابق"
              disabled={!previousChapter}
              onPress={() => previousChapter && goToChapter(previousChapter)}
              style={({ pressed }) => [
                styles.pageNavButton,
                { opacity: !previousChapter ? 0.25 : pressed ? 0.65 : 1 },
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
            <Text style={styles.bottomText}>اضغط لإظهار أو إخفاء التحكم</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  errorSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  btn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { fontWeight: "600", fontSize: 14 },
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
  centerInfo: { alignItems: "center", gap: 3, flex: 1 },
  chapterLabel: { color: "#fff", fontSize: 12, fontWeight: "600", opacity: 0.85 },
  pageCount: { color: "#fff", fontSize: 15, fontWeight: "700" },
  teamPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  teamPillText: { color: "#fff", fontSize: 10, fontWeight: "600" },
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
