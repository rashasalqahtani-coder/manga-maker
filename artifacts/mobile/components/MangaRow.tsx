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

import { MangaCard } from "@/components/MangaCard";
import { useColors } from "@/hooks/useColors";
import type { Manga } from "@/lib/mangadex";

interface MangaRowProps {
  title: string;
  manga: Manga[];
  loading?: boolean;
  error?: boolean;
  onMorePress?: () => void;
}

export function MangaRow({ title, manga, loading, error, onMorePress }: MangaRowProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
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
            <Text style={[styles.moreBtnText, { color: colors.primary }]}>
              عرض المزيد
            </Text>
            <Feather name="chevron-left" size={13} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            تعذّر التحميل
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
          ListFooterComponent={
            onMorePress ? (
              <Pressable
                style={({ pressed }) => [
                  styles.footerMoreBtn,
                  {
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={onMorePress}
              >
                <Feather name="grid" size={20} color={colors.primary} />
                <Text style={[styles.footerMoreText, { color: colors.primary }]}>
                  المزيد
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: "600",
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
  footerMoreBtn: {
    width: 80,
    height: 185,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginLeft: 4,
    marginRight: 16,
  },
  footerMoreText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
