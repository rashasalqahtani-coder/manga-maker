"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

import { SearchBar } from "@/components/SearchBar";
import { useColors } from "@/hooks/useColors";
import { searchMangas, type UnifiedManga } from "@/lib/sources";
import {
  searchTeamManga,
  type PublicTeamChapter,
  type TeamMangaResult,
} from "@/lib/teams";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const MANGADEX_ID_RE = /^[0-9a-f-]{36}$/;
function isMangaDexId(id: string) { return MANGADEX_ID_RE.test(id); }

type SourceKey = "rorym" | "linkmanga" | "kenmanga" | "asq";

interface AllResults {
  rorym: UnifiedManga[];
  linkmanga: UnifiedManga[];
  kenmanga: UnifiedManga[];
  asq: UnifiedManga[];
  teams: TeamMangaResult[];
}

const SOURCE_META: Record<SourceKey, { nameAr: string; flag: string; color: string }> = {
  rorym:     { nameAr: "روري م", flag: "📖", color: "#e11d48" },
  linkmanga: { nameAr: "لينك مانجا", flag: "🔗", color: "#3b82f6" },
  kenmanga:  { nameAr: "أريا مانجا", flag: "🌙", color: "#8b5cf6" },
  asq:       { nameAr: "مانجا العاشق", flag: "📚", color: "#10b981" },
};

/* ─── Team manga card ─── */
function TeamMangaCard({
  item,
  selected,
  onPress,
}: {
  item: TeamMangaResult;
  selected: boolean;
  onPress: () => void;
}) {
  "use no memo";
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.teamCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.teamCardCover} contentFit="cover" />
      ) : (
        <View style={[styles.teamCardCoverPlaceholder, { backgroundColor: colors.secondary }]}>
          <Feather name="book" size={20} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.teamCardBody}>
        <Text style={[styles.teamCardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.teamCardTeam, { color: colors.primary }]} numberOfLines={1}>
          {item.teamEmoji} {item.teamName}
        </Text>
        <Text style={[styles.teamCardChapters, { color: colors.mutedForeground }]}>
          {item.chaptersCount > 0 ? `${item.chaptersCount} فصل` : "لا فصول"}
        </Text>
      </View>
      {selected && (
        <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
          <Feather name="chevron-down" size={11} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

/* ─── Chapter row ─── */
function ChapterRow({ chapter, onRead }: { chapter: PublicTeamChapter; onRead: (() => void) | null }) {
  "use no memo";
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chapterRow,
        { borderBottomColor: colors.border, opacity: pressed && onRead ? 0.7 : 1 },
      ]}
      onPress={onRead ?? undefined}
      disabled={!onRead}
    >
      <View style={[styles.chapterBadge, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.chapterBadgeText, { color: colors.primary }]}>{chapter.number}</Text>
      </View>
      <Text style={[styles.chapterTitle, { color: colors.foreground }]} numberOfLines={1}>
        {chapter.title || `فصل ${chapter.number}`}
      </Text>
      {onRead ? (
        <View style={[styles.readPill, { backgroundColor: colors.primary }]}>
          <Feather name="book-open" size={11} color="#fff" />
          <Text style={styles.readPillText}>اقرأ</Text>
        </View>
      ) : (
        <View style={[styles.localPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.localPillText, { color: colors.mutedForeground }]}>محلي</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ─── Source section header ─── */
function SourceHeader({ srcKey, count }: { srcKey: SourceKey; count: number }) {
  "use no memo";
  const colors = useColors();
  const meta = SOURCE_META[srcKey];
  return (
    <View style={[styles.sourceSectionHeader, { borderLeftColor: meta.color }]}>
      <Text style={styles.sourceSectionFlag}>{meta.flag}</Text>
      <Text style={[styles.sourceSectionName, { color: colors.foreground }]}>{meta.nameAr}</Text>
      <View style={[styles.sourceSectionBadge, { backgroundColor: meta.color + "22" }]}>
        <Text style={[styles.sourceSectionCount, { color: meta.color }]}>{count}</Text>
      </View>
    </View>
  );
}

/* ─── Unified manga mini card (horizontal) ─── */
function UnifiedMiniCard({ manga, onPress }: { manga: UnifiedManga; onPress: () => void }) {
  "use no memo";
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniCard,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Image source={{ uri: manga.coverUrl }} style={[styles.miniCardCover, { borderRadius: colors.radius - 2 }]} contentFit="cover" />
      <Text style={[styles.miniCardTitle, { color: colors.foreground }]} numberOfLines={2}>{manga.title}</Text>
    </Pressable>
  );
}

/* ─── Main Screen ─── */
export default function SearchScreen() {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AllResults>({ rorym: [], linkmanga: [], kenmanga: [], asq: [], teams: [] });
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [searched, setSearched] = useState(false);
  const [activeManga, setActiveManga] = useState<TeamMangaResult | null>(null);

  const searchIdRef = useRef(0);
  const debouncedQuery = useDebounce(query, 550);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ rorym: [], linkmanga: [], kenmanga: [], asq: [], teams: [] });
      setLoadingMap({});
      setActiveManga(null);
      setSearched(false);
      return;
    }

    const id = ++searchIdRef.current;
    setSearched(true);
    setActiveManga(null);
    setLoadingMap({ rorym: true, linkmanga: true, kenmanga: true, asq: true, teams: true });
    setResults({ rorym: [], linkmanga: [], kenmanga: [], asq: [], teams: [] });

    const updateOne = <K extends keyof AllResults>(key: K, value: AllResults[K]) => {
      if (searchIdRef.current !== id) return;
      setResults((prev) => ({ ...prev, [key]: value }));
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    };

    searchMangas("rorym", q.trim())
      .then((r) => updateOne("rorym", r))
      .catch(() => updateOne("rorym", []));

    searchMangas("linkmanga", q.trim())
      .then((r) => updateOne("linkmanga", r))
      .catch(() => updateOne("linkmanga", []));

    searchMangas("kenmanga", q.trim())
      .then((r) => updateOne("kenmanga", r))
      .catch(() => updateOne("kenmanga", []));

    searchMangas("asq", q.trim())
      .then((r) => updateOne("asq", r))
      .catch(() => updateOne("asq", []));

    searchTeamManga(q.trim())
      .then((r) => updateOne("teams", r))
      .catch(() => updateOne("teams", []));
  }, []);

  useEffect(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  const isAnyLoading = Object.values(loadingMap).some(Boolean);

  const totalCount =
    results.rorym.length + results.linkmanga.length + results.kenmanga.length + results.asq.length + results.teams.length;

  function navigateUnified(manga: UnifiedManga, srcId: string) {
    "use no memo";
    router.push({
      pathname: "/starz/[slug]" as any,
      params: {
        slug: manga.slug,
        title: encodeURIComponent(manga.title),
        coverUrl: encodeURIComponent(manga.coverUrl),
        latestChapter: encodeURIComponent(manga.latestChapterNum ?? ""),
        src: srcId,
      },
    });
  }

  /* ── Team groups ── */
  const teamGroups = results.teams.reduce<
    Map<string, { teamId: string; teamName: string; teamEmoji: string; manga: TeamMangaResult[] }>
  >((acc, item) => {
    if (!acc.has(item.teamId)) {
      acc.set(item.teamId, { teamId: item.teamId, teamName: item.teamName, teamEmoji: item.teamEmoji, manga: [] });
    }
    acc.get(item.teamId)!.manga.push(item);
    return acc;
  }, new Map());

  /* ── Chapter drawer ── */
  const chapterDrawer = activeManga ? (
    <View
      style={[
        styles.chapterDrawer,
        { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
      ]}
    >
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
        {activeManga.coverUrl ? (
          <Image source={{ uri: activeManga.coverUrl }} style={styles.drawerCover} contentFit="cover" />
        ) : (
          <View style={[styles.drawerCoverPlaceholder, { backgroundColor: colors.secondary }]}>
            <Feather name="book" size={14} color={colors.mutedForeground} />
          </View>
        )}
        <View style={styles.drawerTitleBlock}>
          <Text style={[styles.drawerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {activeManga.title}
          </Text>
          <Text style={[styles.drawerTeam, { color: colors.primary }]} numberOfLines={1}>
            {activeManga.teamEmoji} {activeManga.teamName}
          </Text>
        </View>
        <Pressable
          style={[styles.viewMangaBtn, { backgroundColor: colors.primary + "18", borderRadius: colors.radius }]}
          onPress={() => router.push(`/teams/${activeManga.teamId}/manga/${activeManga.mangaId}` as any)}
        >
          <Feather name="book-open" size={13} color={colors.primary} />
          <Text style={[styles.viewMangaBtnText, { color: colors.primary }]}>صفحة المانجا</Text>
        </Pressable>
      </View>
      {activeManga.chapters.length === 0 ? (
        <View style={styles.noChapters}>
          <Text style={[styles.noChaptersText, { color: colors.mutedForeground }]}>لا توجد فصول مضافة بعد</Text>
        </View>
      ) : (
        <View>
          {activeManga.chapters.map((ch, idx) => (
            <View key={ch.id} style={idx === activeManga.chapters.length - 1 ? { borderBottomWidth: 0 } : undefined}>
              <ChapterRow
                chapter={ch}
                onRead={
                  isMangaDexId(ch.id)
                    ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/reader/${ch.id}` as any); }
                    : null
                }
              />
            </View>
          ))}
        </View>
      )}
    </View>
  ) : null;

  /* ── Team section ── */
  const teamSection = teamGroups.size > 0 ? (
    <View style={styles.teamSection}>
      <View style={styles.teamSectionHeader}>
        <Feather name="users" size={13} color={colors.primary} />
        <Text style={[styles.teamSectionTitle, { color: colors.foreground }]}>ترجمات الفرق</Text>
        <Text style={[styles.teamSectionCount2, { color: colors.mutedForeground }]}>{results.teams.length}</Text>
        {loadingMap["teams"] && <ActivityIndicator size={10} color={colors.primary} />}
      </View>
      {Array.from(teamGroups.values()).map((group) => (
        <View key={group.teamId} style={styles.teamGroup}>
          <Pressable
            style={styles.teamGroupHeader}
            onPress={() => { Haptics.selectionAsync(); router.push(`/teams/${group.teamId}` as any); }}
          >
            <Text style={styles.teamGroupEmoji}>{group.teamEmoji}</Text>
            <Text style={[styles.teamGroupName, { color: colors.foreground }]} numberOfLines={1}>
              {group.teamName}
            </Text>
            <Text style={[styles.teamGroupCount, { color: colors.mutedForeground }]}>
              {group.manga.length} مانجا
            </Text>
            <Feather name="chevron-left" size={14} color={colors.mutedForeground} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamRow}>
            {group.manga.map((item) => (
              <TeamMangaCard
                key={`${item.teamId}-${item.mangaId}`}
                item={item}
                selected={activeManga?.mangaId === item.mangaId && activeManga?.teamId === item.teamId}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveManga((prev) =>
                    prev?.mangaId === item.mangaId && prev?.teamId === item.teamId ? null : item
                  );
                }}
              />
            ))}
          </ScrollView>
          {activeManga?.teamId === group.teamId && chapterDrawer}
        </View>
      ))}
    </View>
  ) : null;

  /* ── Source sections for FlatList header ── */
  const sourceHeader = searched ? (
    <View style={styles.allSourcesWrapper}>
      {teamSection}

      {/* rorym section */}
      {(results.rorym.length > 0 || loadingMap["rorym"]) && (
        <View style={styles.sourceSection}>
          <View style={styles.sourceSectionTop}>
            <SourceHeader srcKey="rorym" count={results.rorym.length} />
            {loadingMap["rorym"] && <ActivityIndicator size={12} color={SOURCE_META.rorym.color} />}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {results.rorym.map((item) => (
              <UnifiedMiniCard
                key={item.id}
                manga={item}
                onPress={() => navigateUnified(item, "rorym")}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* asq section */}
      {(results.asq.length > 0 || loadingMap["asq"]) && (
        <View style={styles.sourceSection}>
          <View style={styles.sourceSectionTop}>
            <SourceHeader srcKey="asq" count={results.asq.length} />
            {loadingMap["asq"] && <ActivityIndicator size={12} color={SOURCE_META.asq.color} />}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {results.asq.map((item) => (
              <UnifiedMiniCard
                key={item.id}
                manga={item}
                onPress={() => navigateUnified(item, "asq")}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* linkmanga section */}
      {(results.linkmanga.length > 0 || loadingMap["linkmanga"]) && (
        <View style={styles.sourceSection}>
          <View style={styles.sourceSectionTop}>
            <SourceHeader srcKey="linkmanga" count={results.linkmanga.length} />
            {loadingMap["linkmanga"] && <ActivityIndicator size={12} color={SOURCE_META.linkmanga.color} />}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {results.linkmanga.map((item) => (
              <UnifiedMiniCard
                key={item.id}
                manga={item}
                onPress={() => navigateUnified(item, "linkmanga")}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* kenmanga section */}
      {(results.kenmanga.length > 0 || loadingMap["kenmanga"]) && (
        <View style={styles.sourceSection}>
          <View style={styles.sourceSectionTop}>
            <SourceHeader srcKey="kenmanga" count={results.kenmanga.length} />
            {loadingMap["kenmanga"] && <ActivityIndicator size={12} color={SOURCE_META.kenmanga.color} />}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
            {results.kenmanga.map((item) => (
              <UnifiedMiniCard
                key={item.id}
                manga={item}
                onPress={() => navigateUnified(item, "kenmanga")}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>البحث</Text>
        <SearchBar value={query} onChangeText={setQuery} onClear={() => setQuery("")} />
        <View style={styles.sourceChips}>
          {(["rorym", "asq", "linkmanga", "kenmanga"] as SourceKey[]).map((k) => (
            <View
              key={k}
              style={[
                styles.chip,
                { backgroundColor: SOURCE_META[k].color + "18", borderColor: SOURCE_META[k].color + "44" },
              ]}
            >
              <Text style={styles.chipFlag}>{SOURCE_META[k].flag}</Text>
              <Text style={[styles.chipName, { color: SOURCE_META[k].color }]}>{SOURCE_META[k].nameAr}</Text>
              {loadingMap[k] && <ActivityIndicator size={9} color={SOURCE_META[k].color} />}
            </View>
          ))}
        </View>
      </View>

      {/* ── Body ── */}
      {!searched ? (
        <View style={styles.center}>
          <Feather name="search" size={44} color={colors.muted} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>ابحث في كل المصادر</Text>
          <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>
            روري م · مانجا العاشق · لينك مانجا · أريا مانجا · فرق الترجمة
          </Text>
        </View>
      ) : isAnyLoading && totalCount === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>جارٍ البحث في المصادر...</Text>
        </View>
      ) : !isAnyLoading && totalCount === 0 ? (
        <View style={styles.center}>
          <Feather name="frown" size={36} color={colors.mutedForeground} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>لا توجد نتائج</Text>
          <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>
            جرّب البحث بعنوان مختلف
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ""}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={sourceHeader}
          ListEmptyComponent={null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  title: { fontSize: 28, fontWeight: "700" },

  sourceChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipFlag: { fontSize: 11 },
  chipName: { fontSize: 10, fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hint: { fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
  hintSub: { fontSize: 12, textAlign: "center", paddingHorizontal: 32 },

  scrollContent: { paddingTop: 16 },
  allSourcesWrapper: { gap: 24 },

  sourceSection: { gap: 10 },
  sourceSectionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  sourceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderLeftWidth: 3,
    paddingLeft: 9,
  },
  sourceSectionFlag: { fontSize: 14 },
  sourceSectionName: { fontSize: 14, fontWeight: "700", flex: 1 },
  sourceSectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sourceSectionCount: { fontSize: 12, fontWeight: "700" },
  horizontalRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },

  miniCard: {
    width: 106,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  miniCardCover: { width: 106, height: 150 },
  miniCardTitle: { fontSize: 11, fontWeight: "600", padding: 6, lineHeight: 15 },

  /* Team */
  teamSection: { paddingHorizontal: 16, gap: 10 },
  teamSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  teamSectionTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  teamSectionCount2: { fontSize: 12 },
  teamRow: { gap: 10, paddingRight: 4, paddingBottom: 2 },
  teamGroup: { gap: 8 },
  teamGroupHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  teamGroupEmoji: { fontSize: 16 },
  teamGroupName: { flex: 1, fontSize: 13, fontWeight: "700" },
  teamGroupCount: { fontSize: 11 },

  teamCard: { width: 128, overflow: "hidden" },
  teamCardCover: { width: 128, height: 172 },
  teamCardCoverPlaceholder: { width: 128, height: 172, alignItems: "center", justifyContent: "center" },
  teamCardBody: { padding: 8, gap: 3 },
  teamCardTitle: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  teamCardTeam: { fontSize: 11, fontWeight: "600" },
  teamCardChapters: { fontSize: 10 },
  selectedIndicator: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingVertical: 3 },

  chapterDrawer: { borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginTop: 6 },
  drawerHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  drawerCover: { width: 38, height: 52, borderRadius: 5 },
  drawerCoverPlaceholder: { width: 38, height: 52, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  drawerTitleBlock: { flex: 1, gap: 2 },
  drawerTitle: { fontSize: 13, fontWeight: "700" },
  drawerTeam: { fontSize: 12 },
  viewMangaBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 6 },
  viewMangaBtnText: { fontSize: 12, fontWeight: "600" },
  noChapters: { paddingVertical: 20, alignItems: "center" },
  noChaptersText: { fontSize: 13 },

  chapterRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  chapterBadge: { minWidth: 40, alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chapterBadgeText: { fontSize: 12, fontWeight: "700" },
  chapterTitle: { flex: 1, fontSize: 13 },
  readPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  readPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  localPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  localPillText: { fontSize: 10, fontWeight: "600" },
});
