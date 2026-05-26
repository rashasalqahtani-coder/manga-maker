import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MangaCard } from "@/components/MangaCard";
import { useColors } from "@/hooks/useColors";
import type { Manga } from "@/lib/mangadex";

interface MangaRowProps {
  title: string;
  manga: Manga[];
  loading?: boolean;
  error?: boolean;
}

export function MangaRow({ title, manga, loading, error }: MangaRowProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Failed to load
          </Text>
        </View>
      ) : (
        <FlatList
          data={manga}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MangaCard manga={item} />}
          scrollEnabled={!!manga.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  loaderContainer: {
    height: 185,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
  },
});
