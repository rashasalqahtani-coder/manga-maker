import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChapterItem } from "@/components/ChapterItem";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import {
  getCoverUrl,
  getAuthorName,
  getMangaChapters,
  getMangaDescription,
  getMangaDetails,
  getMangaTags,
  getMangaTitle,
  type Chapter,
  type Manga,
} from "@/lib/mangadex";

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isInLibrary, toggleLibrary } = useLibrary();

  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const inLib = manga ? isInLibrary(manga.id) : false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    Promise.all([getMangaDetails(id), getMangaChapters(id)])
      .then(([m, ch]) => {
        setManga(m);
        setChapters(ch);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookmark = () => {
    if (!manga) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLibrary(manga);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !manga) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          تعذّر تحميل المانجا
        </Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setLoading(true);
            setError(false);
          }}
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  const title = getMangaTitle(manga);
  const author = getAuthorName(manga);
  const description = getMangaDescription(manga);
  const tags = getMangaTags(manga);
  const coverUrl = getCoverUrl(manga, "512");
  const status = manga.attributes.status;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.backdrop} contentFit="cover" />
          ) : null}
          <LinearGradient
            colors={["rgba(15,15,15,0.1)", "rgba(15,15,15,0.85)", "#0F0F0F"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + 56 }]}>
            <View
              style={[
                styles.coverShadow,
                { borderRadius: colors.radius, shadowColor: colors.primary },
              ]}
            >
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={[styles.cover, { borderRadius: colors.radius }]}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[styles.cover, { backgroundColor: colors.card, borderRadius: colors.radius }]}
                />
              )}
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={3}>
                {title}
              </Text>
              {author ? (
                <Text style={[styles.heroAuthor, { color: colors.mutedForeground }]}>
                  {author}
                </Text>
              ) : null}
              <View style={[styles.statusRow]}>
                <View style={[styles.statusBadge, { backgroundColor: status === "ongoing" ? colors.primary : colors.secondary }]}>
                  <Text style={[styles.statusText, { color: status === "ongoing" ? "#fff" : colors.foreground }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
                {manga.attributes.year ? (
                  <Text style={[styles.year, { color: colors.mutedForeground }]}>
                    {manga.attributes.year}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                  flex: 1,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => chapters[chapters.length - 1] && router.push(`/reader/${chapters[chapters.length - 1].id}`)}
            >
              <Feather name="book-open" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>ابدأ القراءة</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: inLib ? colors.primary : colors.card,
                  opacity: pressed ? 0.8 : 1,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={handleBookmark}
            >
              <Feather
                name={inLib ? "bookmark" : "bookmark"}
                size={22}
                color={inLib ? "#fff" : colors.foreground}
              />
            </Pressable>
          </View>

          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: colors.card, borderRadius: 6 }]}
                >
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {description ? (
            <View style={styles.descSection}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                القصة
              </Text>
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>
                {description}
              </Text>
            </View>
          ) : null}

          <View style={styles.chaptersSection}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              الفصول ({chapters.length})
            </Text>
          </View>
        </View>

        {chapters.length === 0 ? (
          <View style={styles.noChapters}>
            <Text style={[styles.noChaptersText, { color: colors.mutedForeground }]}>
              لا تتوفر فصول بالإنجليزية
            </Text>
          </View>
        ) : (
          chapters.map((ch) => (
            <ChapterItem key={ch.id} chapter={ch} manga={manga ?? undefined} />
          ))
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>

      <View style={[styles.backBtn, { top: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backPressable, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 15,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  hero: {
    height: 340,
    position: "relative",
    overflow: "hidden",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  coverShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  cover: {
    width: 110,
    height: 156,
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 26,
  },
  heroAuthor: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  year: {
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  iconBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  descSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
  },
  chaptersSection: {
    marginBottom: 4,
  },
  noChapters: {
    padding: 24,
    alignItems: "center",
  },
  noChaptersText: {
    fontSize: 14,
  },
  backBtn: {
    position: "absolute",
    left: 14,
  },
  backPressable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
