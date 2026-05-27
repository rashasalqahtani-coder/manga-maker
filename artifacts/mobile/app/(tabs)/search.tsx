import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MangaCard } from "@/components/MangaCard";
import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import {
  browseMangaByGenre,
  getGenres,
  searchManga,
  type Manga,
  type MangaTagItem,
} from "@/lib/mangadex";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type OriginFilter = "all" | "jp" | "ko" | "zh";

const ORIGIN_OPTS: { id: OriginFilter; label: string; emoji: string }[] = [
  { id: "all", label: "الكل",    emoji: "🌍" },
  { id: "jp",  label: "مانجا",   emoji: "🇯🇵" },
  { id: "ko",  label: "مانهوا",  emoji: "🇰🇷" },
  { id: "zh",  label: "مانهوا صيني", emoji: "🇨🇳" },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [query,          setQuery]          = useState("");
  const [originFilter,   setOriginFilter]   = useState<OriginFilter>("all");
  const [results,        setResults]        = useState<Manga[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [searched,       setSearched]       = useState(false);
  const [showGenres,     setShowGenres]     = useState(false);
  const [genres,         setGenres]         = useState<MangaTagItem[]>([]);
  const [selectedGenre,  setSelectedGenre]  = useState<MangaTagItem | null>(null);

  const debouncedQuery = useDebounce(query, 600);

  useEffect(() => {
    getGenres().then(setGenres).catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (q: string, genre: MangaTagItem | null, origin: OriginFilter) => {
      if (!q.trim() && !genre) {
        setResults([]); setSearched(false); return;
      }
      setLoading(true); setSearched(true);
      try {
        let data: Manga[];
        if (q.trim()) {
          data = await searchManga(q.trim());
          if (genre) data = data.filter((m) => m.attributes.tags.some((t) => t.id === genre.id));
        } else {
          data = await browseMangaByGenre(genre!.id);
        }
        // Client-side origin filter
        if (origin !== "all") {
          const langMap: Record<OriginFilter, string[]> = { all: [], jp: ["ja"], ko: ["ko"], zh: ["zh", "zh-hk"] };
          // MangaDex doesn't always expose originalLanguage on list results, so we filter by title lang heuristic
          // For now just return all — the API already filters by available Arabic
        }
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    doSearch(debouncedQuery, selectedGenre, originFilter);
  }, [debouncedQuery, selectedGenre, originFilter, doSearch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>البحث</Text>

        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={query} onChangeText={setQuery} onClear={() => setQuery("")} />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: showGenres || selectedGenre ? colors.primary : colors.card,
                borderColor: showGenres || selectedGenre ? colors.primary : colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={() => { Haptics.selectionAsync(); setShowGenres((v) => !v); }}
          >
            <Feather name="sliders" size={18} color={showGenres || selectedGenre ? "#fff" : colors.foreground} />
          </Pressable>
        </View>

        {/* Origin filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.originRow}>
          {ORIGIN_OPTS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.originChip,
                {
                  backgroundColor: originFilter === opt.id ? colors.primary : colors.card,
                  borderColor: originFilter === opt.id ? colors.primary : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => { Haptics.selectionAsync(); setOriginFilter(opt.id); }}
            >
              <Text style={styles.originEmoji}>{opt.emoji}</Text>
              <Text style={[styles.originLabel, { color: originFilter === opt.id ? "#fff" : colors.foreground }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Active genre badge */}
        {selectedGenre && (
          <Pressable
            style={[styles.activeGenreBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
            onPress={() => { setSelectedGenre(null); Haptics.selectionAsync(); }}
          >
            <Feather name="tag" size={12} color={colors.primary} />
            <Text style={[styles.activeGenreText, { color: colors.primary }]}>
              {selectedGenre.attributes.name["en"] || Object.values(selectedGenre.attributes.name)[0]}
            </Text>
            <Feather name="x" size={12} color={colors.primary} />
          </Pressable>
        )}

        {/* Genre picker */}
        {showGenres && genres.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.genreScroll}
            contentContainerStyle={styles.genreList}
          >
            {genres.map((genre) => {
              const name = genre.attributes.name["en"] || Object.values(genre.attributes.name)[0];
              const isActive = selectedGenre?.id === genre.id;
              return (
                <Pressable
                  key={genre.id}
                  style={[
                    styles.genreChip,
                    { backgroundColor: isActive ? colors.primary : colors.card, borderColor: isActive ? colors.primary : colors.border, borderRadius: 20 },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedGenre((prev) => (prev?.id === genre.id ? null : genre)); setShowGenres(false); }}
                >
                  <Text style={[styles.genreChipText, { color: isActive ? "#fff" : colors.foreground }]}>{name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Results ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>جار البحث...</Text>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Feather name="search" size={44} color={colors.muted} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>ابحث بالعنوان أو اختر فئة</Text>
          <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>
            يبحث في المانجا والمانهوا المترجمة للعربية
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Feather name="frown" size={36} color={colors.mutedForeground} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>لا توجد نتائج عربية</Text>
          <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>جرّب البحث بالعنوان الإنجليزي</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 20 }]}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <MangaCard manga={item} width={110} height={158} />}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {results.length} نتيجة عربية
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  title: { fontSize: 28, fontWeight: "700" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  originRow: { gap: 8 },
  originChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  originEmoji: { fontSize: 14 },
  originLabel: { fontSize: 12, fontWeight: "600" },
  activeGenreBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  activeGenreText: { fontSize: 12, fontWeight: "600" },
  genreScroll: { marginHorizontal: -16 },
  genreList: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  genreChip: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  genreChipText: { fontSize: 13, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hint: { fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
  hintSub: { fontSize: 12, textAlign: "center", paddingHorizontal: 32 },
  grid: { padding: 16, gap: 12 },
  gridRow: { gap: 10 },
  resultCount: { fontSize: 12, marginBottom: 8, textAlign: "right" },
});
