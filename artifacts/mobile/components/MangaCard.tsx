import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Manga } from "@/lib/mangadex";
import { getCoverUrl, getMangaTitle } from "@/lib/mangadex";

interface MangaCardProps {
  manga: Manga;
  width?: number;
  height?: number;
}

export function MangaCard({ manga, width = 130, height = 185 }: MangaCardProps) {
  const colors = useColors();
  const router = useRouter();
  const title = getMangaTitle(manga);
  const coverUrl = getCoverUrl(manga, "256");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { width, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => router.push(`/manga/${manga.id}`)}
    >
      <View
        style={[
          styles.coverWrapper,
          { width, height, backgroundColor: colors.card, borderRadius: colors.radius },
        ]}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={[styles.cover, { borderRadius: colors.radius }]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.muted }]} />
        )}
        <View style={styles.gradient}>
          <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.statusText}>
              {manga.attributes.status === "ongoing" ? "ON" : "END"}
            </Text>
          </View>
        </View>
      </View>
      <Text
        style={[styles.title, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  coverWrapper: {
    overflow: "hidden",
    position: "relative",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
  },
  gradient: {
    position: "absolute",
    top: 6,
    left: 6,
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
