import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
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
import { useLibrary } from "@/context/LibraryContext";
import type { TeamManga } from "@/context/TeamContext";
import { useColors } from "@/hooks/useColors";

function LocalMangaCard({ manga }: { manga: TeamManga }) {
  const colors = useColors();
  const router = useRouter();
  const coverSrc = manga.localCoverUri ?? manga.coverUrl;

  return (
    <Pressable
      style={({ pressed }) => [styles.localCard, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => router.push(`/team` as any)}
    >
      <View
        style={[
          styles.localCoverWrap,
          { backgroundColor: colors.card, borderRadius: colors.radius },
        ]}
      >
        {coverSrc ? (
          <Image
            source={{ uri: coverSrc }}
            style={[styles.localCover, { borderRadius: colors.radius }]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.localCoverPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="book" size={22} color={colors.mutedForeground} />
          </View>
        )}
        <View style={[styles.teamBadge, { backgroundColor: colors.primary }]}>
          <Feather name="users" size={9} color="#fff" />
        </View>
      </View>
      <Text
        style={[styles.localCardTitle, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {manga.title}
      </Text>
      <Text style={[styles.localCardSub, { color: colors.mutedForeground }]}>
        {manga.chapters.length} {manga.chapters.length === 1 ? "فصل" : "فصول"}
      </Text>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { library, localLibrary } = useLibrary();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;
  const totalCount = library.length + localLibrary.length;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>مكتبتي</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {totalCount} مانجا
        </Text>
      </View>

      {/* ── Local team manga ── */}
      {localLibrary.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="users" size={15} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              مانجا الفريق
            </Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {localLibrary.length}
            </Text>
          </View>
          <FlatList
            data={localLibrary}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.localRow}
            renderItem={({ item }) => <LocalMangaCard manga={item} />}
            scrollEnabled={localLibrary.length > 2}
          />
        </View>
      )}

      {/* ── MangaDex library ── */}
      {library.length > 0 && (
        <View style={styles.section}>
          {localLibrary.length > 0 && (
            <View style={styles.sectionHeader}>
              <Feather name="globe" size={15} color={colors.mutedForeground} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                MangaDex
              </Text>
              <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                {library.length}
              </Text>
            </View>
          )}
          <View style={styles.grid}>
            {library.map((manga) => (
              <MangaCard key={manga.id} manga={manga} width={110} height={158} />
            ))}
          </View>
        </View>
      )}

      {/* ── Empty state ── */}
      {totalCount === 0 && (
        <View style={styles.empty}>
          <Feather name="bookmark" size={52} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            لا توجد مانجا محفوظة
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            احفظ مانجاك المفضلة أو أضفها من فريق الترجمة
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  title: { fontSize: 28, fontWeight: "700" },
  count: { fontSize: 13 },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  sectionCount: { fontSize: 13 },
  localRow: { paddingHorizontal: 16, gap: 12 },
  localCard: { width: 110 },
  localCoverWrap: { width: 110, height: 158, overflow: "hidden", position: "relative" },
  localCover: { width: "100%", height: "100%" },
  localCoverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  teamBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  localCardTitle: { marginTop: 6, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  localCardSub: { fontSize: 11, marginTop: 2 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    marginTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
