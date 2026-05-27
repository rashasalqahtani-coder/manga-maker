import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StarzMangaCard } from "@/components/StarzMangaCard";
import { useColors } from "@/hooks/useColors";
import type { StarzManga } from "@/lib/mangastarz";

interface Props {
  title: string;
  manga: StarzManga[];
  loading?: boolean;
  error?: boolean;
  onMorePress?: () => void;
  onPressManga?: (manga: StarzManga) => void;
}

export function StarzMangaRow({ title, manga, loading, error, onMorePress, onPressManga }: Props) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {onMorePress && !loading && !error && (
          <Pressable
            style={({ pressed }) => [
              styles.moreBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: 20,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={onMorePress}
          >
            <Text style={[styles.moreBtnText, { color: colors.primary }]}>عرض المزيد</Text>
            <Feather name="chevron-left" size={13} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error || manga.length === 0 ? (
        <View style={styles.loaderContainer}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            {error ? "تعذّر التحميل" : "لا توجد نتائج"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={manga}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <StarzMangaCard manga={item} onPress={onPressManga} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  moreBtnText: { fontSize: 12, fontWeight: "600" },
  listContent: { paddingHorizontal: 16 },
  loaderContainer: { height: 185, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14 },
});
