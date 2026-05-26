import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getCoverUrl, getMangaTitle, type Manga } from "@/lib/mangadex";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HISTORY_KEY = "@manga_history";

export interface HistoryEntry {
  manga: Manga;
  chapterId: string;
  chapterNum: string | null;
  readAt: number;
}

export async function addToHistory(entry: HistoryEntry) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((e) => e.chapterId !== entry.chapterId);
    const updated = [entry, ...filtered].slice(0, 100);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw) as HistoryEntry[]);
    });
  }, []);

  const clearHistory = async () => {
    await AsyncStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>التاريخ</Text>
        {history.length > 0 && (
          <Pressable onPress={clearHistory} hitSlop={8}>
            <Text style={[styles.clearBtn, { color: colors.primary }]}>مسح الكل</Text>
          </Pressable>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="clock" size={52} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد تاريخ</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            ستظهر هنا الفصول التي قرأتها.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.chapterId}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => {
            const title = getMangaTitle(item.manga);
            const cover = getCoverUrl(item.manga, "256");
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  { backgroundColor: pressed ? colors.card : "transparent" },
                ]}
                onPress={() => router.push(`/reader/${item.chapterId}`)}
              >
                <View
                  style={[
                    styles.coverWrap,
                    { backgroundColor: colors.card, borderRadius: 6 },
                  ]}
                >
                  {cover ? (
                    <Image
                      source={{ uri: cover }}
                      style={[styles.cover, { borderRadius: 6 }]}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
                <View style={styles.info}>
                  <Text
                    style={[styles.mangaTitle, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Text style={[styles.chapterLabel, { color: colors.mutedForeground }]}>
                    {item.chapterNum ? `فصل ${item.chapterNum}` : "فصل"}
                  </Text>
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
                    {timeAgo(item.readAt)}
                  </Text>
                </View>
                <Feather name="play-circle" size={22} color={colors.primary} />
              </Pressable>
            );
          }}
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontWeight: "700" },
  clearBtn: { fontSize: 14, fontWeight: "600" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  coverWrap: { width: 52, height: 74, overflow: "hidden" },
  cover: { width: "100%", height: "100%" },
  info: { flex: 1, gap: 3 },
  mangaTitle: { fontSize: 14, fontWeight: "700" },
  chapterLabel: { fontSize: 12, fontWeight: "500" },
  timeLabel: { fontSize: 11 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
