"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HISTORY_KEY = "@manga_history";

export interface HistoryEntry {
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  chapterId: string;
  chapterNum: string | null;
  readAt: number;
}

export async function addToHistory(entry: HistoryEntry) {
  try {
    if (!entry.chapterId) return;
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((e) => e.chapterId !== entry.chapterId);
    const updated = [entry, ...filtered].slice(0, 100);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function getLastReadChapter(mangaId: string): Promise<HistoryEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const list: HistoryEntry[] = JSON.parse(raw);
    return list.find((e) => e.mangaId === mangaId) ?? null;
  } catch {
    return null;
  }
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function HistoryScreen() {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(HISTORY_KEY)
        .then((raw) => {
          if (raw) setHistory(JSON.parse(raw) as HistoryEntry[]);
          else setHistory([]);
        })
        .catch(() => {});
    }, [])
  );

  const saveHistory = async (list: HistoryEntry[]) => {
    setHistory(list);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  };

  const enterSelectMode = (firstId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelecting(true);
    setSelected(firstId ? new Set([firstId]) : new Set());
  };

  const exitSelectMode = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === history.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(history.map((e) => e.chapterId)));
    }
  };

  const deleteSelected = () => {
    const count = selected.size;
    if (count === 0) return;

    const doDelete = async () => {
      const updated = history.filter((e) => !selected.has(e.chapterId));
      await saveHistory(updated);
      exitSelectMode();
    };

    if (Platform.OS === "web") {
      doDelete();
      return;
    }
    Alert.alert(
      "حذف المحدد",
      `هل تريد حذف ${count} ${count === 1 ? "عنصر" : "عناصر"} من التاريخ؟`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: doDelete },
      ]
    );
  };

  const deleteSingle = async (id: string) => {
    const doDelete = async () => {
      const updated = history.filter((e) => e.chapterId !== id);
      await saveHistory(updated);
    };
    if (Platform.OS === "web") {
      doDelete();
      return;
    }
    Alert.alert("حذف", "هل تريد حذف هذا الفصل من التاريخ؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: doDelete },
    ]);
  };

  const clearAll = () => {
    if (Platform.OS === "web") {
      saveHistory([]);
      return;
    }
    Alert.alert("مسح التاريخ", "هل تريد مسح كامل التاريخ؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "مسح", style: "destructive", onPress: () => saveHistory([]) },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  const allSelected = history.length > 0 && selected.size === history.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        {selecting ? (
          <>
            <Pressable onPress={exitSelectMode} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.mutedForeground }]}>إلغاء</Text>
            </Pressable>
            <Text style={[styles.headerCount, { color: colors.foreground }]}>
              {selected.size} محدد
            </Text>
            <Pressable onPress={toggleSelectAll} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.primary }]}>
                {allSelected ? "إلغاء الكل" : "تحديد الكل"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>التاريخ</Text>
            <View style={styles.headerBtns}>
              {history.length > 0 && (
                <>
                  <Pressable onPress={() => enterSelectMode()} hitSlop={8}>
                    <Text style={[styles.headerAction, { color: colors.primary }]}>تحديد</Text>
                  </Pressable>
                  <Pressable onPress={clearAll} hitSlop={8}>
                    <Text style={[styles.headerAction, { color: "#EF4444" }]}>مسح الكل</Text>
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}
      </View>

      {/* ── EMPTY STATE ── */}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + (selecting ? 170 : 104) }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.chapterId);

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: isSelected
                      ? colors.primary + "18"
                      : pressed
                      ? colors.card
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  if (selecting) {
                    toggleSelect(item.chapterId);
                  } else if (item.chapterId.startsWith("rorym__")) {
                    const parts = item.chapterId.split("__");
                    router.push({
                      pathname: "/rorym/reader" as any,
                      params: {
                        slug: parts[1] || item.mangaId,
                        chapterNum: parts[2] || item.chapterNum || "",
                        title: encodeURIComponent(item.mangaTitle),
                        coverUrl: item.coverUrl ? encodeURIComponent(item.coverUrl) : "",
                      },
                    });
                  } else if (item.chapterId.includes("__")) {
                    const parts = item.chapterId.split("__");
                    const src = parts[0];
                    const slug = parts[1];
                    const chNum = parts[2] || item.chapterNum || "";
                    router.push({
                      pathname: "/starz/reader" as any,
                      params: {
                        url: "",
                        title: encodeURIComponent(item.mangaTitle),
                        chapterNum: encodeURIComponent(chNum),
                        slug: encodeURIComponent(slug),
                        src,
                        coverUrl: item.coverUrl ? encodeURIComponent(item.coverUrl) : "",
                      },
                    });
                  } else {
                    router.push({
                      pathname: "/reader/[chapterId]" as any,
                      params: {
                        chapterId: item.chapterId,
                        mangaId: item.mangaId,
                        mangaTitle: item.mangaTitle,
                        coverUrl: item.coverUrl ?? "",
                        chapterNum: item.chapterNum ?? "",
                      },
                    });
                  }
                }}
                onLongPress={() => {
                  if (!selecting) enterSelectMode(item.chapterId);
                }}
              >
                {/* Checkbox */}
                {selecting && (
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {isSelected && <Feather name="check" size={12} color="#fff" />}
                  </View>
                )}

                {/* Cover */}
                <View style={[styles.coverWrap, { backgroundColor: colors.card, borderRadius: 6 }]}>
                  {item.coverUrl ? (
                    <Image
                      source={{ uri: item.coverUrl }}
                      style={[styles.cover, { borderRadius: 6 }]}
                      contentFit="cover"
                    />
                  ) : null}
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.mangaTitle}
                  </Text>
                  <Text style={[styles.chapterLabel, { color: colors.mutedForeground }]}>
                    {item.chapterNum ? `فصل ${item.chapterNum}` : "فصل"}
                  </Text>
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
                    {timeAgo(item.readAt)}
                  </Text>
                </View>

                {/* Right action */}
                {selecting ? null : (
                  <Pressable
                    onPress={() => deleteSingle(item.chapterId)}
                    hitSlop={8}
                    style={styles.trashBtn}
                  >
                    <Feather name="trash-2" size={17} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* ── BOTTOM DELETE BAR ── */}
      {selecting && selected.size > 0 && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <Pressable
            style={[styles.deleteBtn, { backgroundColor: "#EF4444" }]}
            onPress={deleteSelected}
          >
            <Feather name="trash-2" size={16} color="#fff" />
            <Text style={styles.deleteBtnText}>
              حذف {selected.size} {selected.size === 1 ? "عنصر" : "عناصر"}
            </Text>
          </Pressable>
        </View>
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
  headerBtns: { flexDirection: "row", gap: 16, alignItems: "center" },
  headerAction: { fontSize: 14, fontWeight: "600" },
  headerCount: { fontSize: 16, fontWeight: "600" },
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  coverWrap: { width: 52, height: 74, overflow: "hidden" },
  cover: { width: "100%", height: "100%" },
  info: { flex: 1, gap: 3 },
  mangaTitle: { fontSize: 14, fontWeight: "700" },
  chapterLabel: { fontSize: 12, fontWeight: "500" },
  timeLabel: { fontSize: 11 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  trashBtn: { padding: 4 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
