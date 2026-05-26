import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";
import type { Chapter, Manga } from "@/lib/mangadex";

interface ChapterItemProps {
  chapter: Chapter;
  manga?: Manga;
  isRead?: boolean;
}

export function ChapterItem({ chapter, manga, isRead }: ChapterItemProps) {
  const colors = useColors();
  const router = useRouter();
  const { downloads, startDownload, cancelDownload } = useDownloads();

  const chapterNum = chapter.attributes.chapter
    ? `فصل ${chapter.attributes.chapter}`
    : "قصة مستقلة";
  const vol = chapter.attributes.volume
    ? `مجلد ${chapter.attributes.volume} · `
    : "";
  const title = chapter.attributes.title ? ` — ${chapter.attributes.title}` : "";
  const pagesCount = chapter.attributes.pages;
  const date = new Date(chapter.attributes.publishAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const dl = downloads[chapter.id];
  const isDownloading = dl?.status === "downloading";
  const isDone = dl?.status === "done";
  const progress = dl?.progress ?? 0;

  const handleDownload = () => {
    if (!manga) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isDownloading) {
      cancelDownload(chapter.id);
    } else if (!isDone) {
      startDownload(chapter.id, manga, chapter.attributes.chapter);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.secondary : "transparent",
          borderBottomColor: colors.border,
        },
      ]}
      onPress={() => router.push(`/reader/${chapter.id}`)}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.chapterNum,
            { color: isRead ? colors.mutedForeground : colors.foreground },
          ]}
        >
          {vol}
          {chapterNum}
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {date} · {pagesCount} صفحة
          </Text>
          {isDone && (
            <View style={[styles.offlineBadge, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="wifi-off" size={10} color={colors.primary} />
              <Text style={[styles.offlineText, { color: colors.primary }]}>محمّل</Text>
            </View>
          )}
        </View>
        {isDownloading && (
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
        )}
      </View>

      {manga && (
        <Pressable
          onPress={handleDownload}
          hitSlop={10}
          style={styles.dlBtn}
          disabled={isDone}
        >
          {isDownloading ? (
            <ActivityIndicator size={16} color={colors.primary} />
          ) : isDone ? (
            <Feather name="check-circle" size={18} color={colors.primary} />
          ) : (
            <Feather name="download" size={18} color={colors.mutedForeground} />
          )}
        </Pressable>
      )}

      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  chapterNum: {
    fontSize: 14,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meta: {
    fontSize: 12,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: "700",
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  dlBtn: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
