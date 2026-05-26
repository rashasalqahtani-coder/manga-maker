import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  getCoverUrl,
  getAuthorName,
  getMangaTags,
  getMangaTitle,
  type Manga,
} from "@/lib/mangadex";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface FeaturedBannerProps {
  manga: Manga[];
  loading?: boolean;
  error?: boolean;
}

function BannerCard({ manga }: { manga: Manga }) {
  const colors = useColors();
  const router = useRouter();
  const title = getMangaTitle(manga);
  const author = getAuthorName(manga);
  const tags = getMangaTags(manga).slice(0, 3);
  const cover = getCoverUrl(manga, "512");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: CARD_WIDTH, borderRadius: colors.radius * 1.5, opacity: pressed ? 0.92 : 1 },
      ]}
      onPress={() => router.push(`/manga/${manga.id}`)}
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)"]}
        locations={[0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cardContent}>
        <View style={styles.topBadge}>
          <Feather name="star" size={11} color="#FFD700" />
          <Text style={styles.topBadgeText}>أفضل تقييماً</Text>
        </View>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: "rgba(255,255,255,0.15)" }]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        {author ? (
          <Text style={styles.cardAuthor} numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        <View style={[styles.readBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
          <Feather name="book-open" size={14} color="#fff" />
          <Text style={styles.readBtnText}>اقرأ الآن</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function FeaturedBanner({ manga, loading, error }: FeaturedBannerProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.card, borderRadius: colors.radius * 1.5 }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>
          جارٍ تحميل أفضل المانجا...
        </Text>
      </View>
    );
  }

  if (error || manga.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Feather name="star" size={18} color="#FFD700" />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          أفضل المانجا
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={manga}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={{ marginRight: 12 }}>
            <BannerCard manga={item} />
          </View>
        )}
      />

      <View style={styles.dots}>
        {manga.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex ? colors.primary : colors.muted,
                width: i === activeIndex ? 18 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  loaderContainer: {
    marginHorizontal: 16,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  loaderText: {
    fontSize: 13,
  },
  card: {
    height: 220,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardContent: {
    padding: 14,
    gap: 7,
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,215,0,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
  },
  topBadgeText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "700",
  },
  tags: {
    flexDirection: "row",
    gap: 5,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 26,
  },
  cardAuthor: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
  },
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 2,
  },
  readBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
