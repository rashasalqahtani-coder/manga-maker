import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { StarzManga } from "@/lib/mangastarz";

interface Props {
  manga: StarzManga;
  width?: number;
  height?: number;
  onPress?: (manga: StarzManga) => void;
}

export function StarzMangaCard({ manga, width = 130, height = 185, onPress }: Props) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = () => {
    if (onPress) { onPress(manga); return; }
    router.push({
      pathname: "/starz/[slug]" as any,
      params: {
        slug: manga.slug,
        title: encodeURIComponent(manga.title),
        coverUrl: encodeURIComponent(manga.coverUrl),
        rating: encodeURIComponent(manga.rating ?? ""),
        latestChapter: encodeURIComponent(manga.latestChapters[0]?.number ?? ""),
      },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, { width, opacity: pressed ? 0.75 : 1 }]}
      onPress={handlePress}
    >
      <View
        style={[
          styles.coverWrapper,
          { width, height, backgroundColor: colors.card, borderRadius: colors.radius },
        ]}
      >
        {manga.coverUrl ? (
          <Image
            source={{ uri: manga.coverUrl }}
            style={[styles.cover, { borderRadius: colors.radius }]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.muted }]} />
        )}
        {manga.rating && (
          <View style={[styles.ratingBadge, { backgroundColor: "rgba(0,0,0,0.65)" }]}>
            <Text style={styles.ratingText}>⭐ {manga.rating}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {manga.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginRight: 12 },
  coverWrapper: { overflow: "hidden", position: "relative" },
  cover: { width: "100%", height: "100%" },
  placeholder: { flex: 1 },
  ratingBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: { color: "#FFD700", fontSize: 9, fontWeight: "700" },
  title: { marginTop: 6, fontSize: 12, fontWeight: "600", lineHeight: 16 },
});
