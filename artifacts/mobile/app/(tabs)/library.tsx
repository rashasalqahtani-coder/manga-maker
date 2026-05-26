import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MangaCard } from "@/components/MangaCard";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { library } = useLibrary();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Library</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {library.length} {library.length === 1 ? "manga" : "manga"}
        </Text>
      </View>

      {library.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bookmark" size={52} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No saved manga
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Bookmark your favorite manga to find them here quickly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + 20 },
          ]}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <MangaCard manga={item} width={110} height={158} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  count: {
    fontSize: 13,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  row: {
    gap: 10,
  },
});
