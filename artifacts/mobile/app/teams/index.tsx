"use no memo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { searchPublicTeams, type PublicTeam } from "@/lib/teams";

export default function TeamsDiscoveryScreen() {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (q: string) => {
    setError(false);
    if (q) setSearching(true); else setLoading(true);
    try {
      const results = await searchPublicTeams(q);
      setTeams(results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      if (text.trim().length === 0) {
        load("");
        return;
      }
      if (text.trim().length < 2) return;
      load(text.trim());
    },
    [load]
  );

  const topPad = Platform.OS === "web" ? 20 : insets.top + 16;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          فرق الترجمة
        </Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { paddingHorizontal: 16, paddingBottom: 10 }]}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={query}
            onChangeText={handleSearch}
            placeholder="ابحث عن فريق ترجمة..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator size={14} color={colors.mutedForeground} />
          ) : query.length > 0 ? (
            <Pressable hitSlop={8} onPress={() => { setQuery(""); load(""); }}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            جارٍ تحميل الفرق...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={44} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            تعذّر التحميل
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => load(query)}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : teams.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={44} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {query ? `لا توجد نتائج لـ «${query}»` : "لا توجد فرق منشورة بعد"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {query ? "جرّب كلمة بحث مختلفة" : "انشر فريقك ليظهر هنا"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          renderItem={({ item }) => (
            <TeamCard team={item} onPress={() => {
              Haptics.selectionAsync();
              router.push(`/teams/${encodeURIComponent(item.id)}` as any);
            }} />
          )}
        />
      )}
    </View>
  );
}

function TeamCard({ team, onPress }: { team: PublicTeam; onPress: () => void }) {
  const colors = useColors();
  const totalChapters = team.manga.reduce((s, m) => s + m.chapters.length, 0);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.teamCard,
        { backgroundColor: colors.card, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.teamEmoji, { backgroundColor: colors.primary + "18" }]}>
        <Text style={styles.teamEmojiText}>{team.emoji}</Text>
      </View>
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>
          {team.name}
        </Text>
        {team.description ? (
          <Text style={[styles.teamDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {team.description}
          </Text>
        ) : null}
        <View style={styles.teamMeta}>
          <View style={styles.metaItem}>
            <Feather name="book-open" size={12} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>
              {team.manga.length} مانجا
            </Text>
          </View>
          <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>•</Text>
          <View style={styles.metaItem}>
            <Feather name="layers" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {totalChapters} فصل
            </Text>
          </View>
        </View>
      </View>
      {/* Mini manga covers */}
      <View style={styles.mangaPreviews}>
        {team.manga.slice(0, 3).map((m) =>
          m.coverUrl ? (
            <Image
              key={m.id}
              source={{ uri: m.coverUrl }}
              style={styles.miniCover}
              contentFit="cover"
            />
          ) : (
            <View
              key={m.id}
              style={[styles.miniCover, { backgroundColor: colors.secondary }]}
            >
              <Feather name="book" size={10} color={colors.mutedForeground} />
            </View>
          )
        )}
      </View>
      <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 30 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  searchWrap: {},
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: { fontSize: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  list: { padding: 16, gap: 10 },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  teamEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  teamEmojiText: { fontSize: 26 },
  teamInfo: { flex: 1, gap: 3 },
  teamName: { fontSize: 15, fontWeight: "700" },
  teamDesc: { fontSize: 12, lineHeight: 17 },
  teamMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontWeight: "600" },
  metaDot: { fontSize: 10 },
  mangaPreviews: { flexDirection: "row", gap: 3 },
  miniCover: {
    width: 28,
    height: 38,
    borderRadius: 4,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
