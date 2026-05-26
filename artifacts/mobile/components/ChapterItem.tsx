import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Chapter } from "@/lib/mangadex";

interface ChapterItemProps {
  chapter: Chapter;
  isRead?: boolean;
}

export function ChapterItem({ chapter, isRead }: ChapterItemProps) {
  const colors = useColors();
  const router = useRouter();

  const chapterNum = chapter.attributes.chapter
    ? `Ch. ${chapter.attributes.chapter}`
    : "Oneshot";
  const vol = chapter.attributes.volume
    ? `Vol. ${chapter.attributes.volume} · `
    : "";
  const title = chapter.attributes.title ? ` — ${chapter.attributes.title}` : "";
  const pages = chapter.attributes.pages;
  const date = new Date(chapter.attributes.publishAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {date} · {pages} pages
        </Text>
      </View>
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
  },
  left: {
    flex: 1,
    gap: 3,
  },
  chapterNum: {
    fontSize: 14,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
  },
});
