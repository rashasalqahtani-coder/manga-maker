import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { MANGA_GENRES } from "@/lib/genres";

const GENRE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  "أكشن": "zap",
  "رومانسي": "heart",
  "مغامرات": "map",
  "خيال": "moon",
  "كوميدي": "smile",
  "دراما": "film",
  "غموض": "help-circle",
  "رعب": "alert-triangle",
  "رياضي": "activity",
  "مدرسي": "book",
  "تاريخي": "clock",
  "خيال علمي": "cpu",
};

export default function GenresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.back, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.foreground }]}>التصنيفات</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>اختر ما يناسب ذوقك</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={[...MANGA_GENRES]}
        keyExtractor={(item) => item}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
            onPress={() =>
              router.push({
                pathname: "/genre/[name]" as any,
                params: { name: encodeURIComponent(item) },
              })
            }
          >
            <View style={[styles.icon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name={GENRE_ICONS[item] ?? "tag"} size={21} color={colors.primary} />
            </View>
            <Text style={[styles.genre, { color: colors.foreground }]}>{item}</Text>
            <Feather name="chevron-left" size={15} color={colors.mutedForeground} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, alignItems: "center", gap: 2 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 11 },
  headerSpacer: { width: 38 },
  content: { padding: 16, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    minHeight: 78,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  genre: { flex: 1, fontSize: 14, fontWeight: "800", textAlign: "right" },
});