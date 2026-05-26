import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MangaCard } from "@/components/MangaCard";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { searchManga, type Manga } from "@/lib/mangadex";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 600);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchManga(q.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Search for manga by title
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            No results found for "{query}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  row: {
    gap: 10,
  },
});
