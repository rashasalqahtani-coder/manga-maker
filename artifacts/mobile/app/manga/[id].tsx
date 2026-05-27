import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChapterItem } from "@/components/ChapterItem";
import { useLibrary } from "@/context/LibraryContext";
import { useColors } from "@/hooks/useColors";
import {
  extractGroups,
  getChapterGroup,
  getCoverUrl,
  getAuthorName,
  getMangaChapters,
  getMangaDescription,
  getMangaDetails,
  getMangaTags,
  getMangaTitle,
  type Chapter,
  type Manga,
  type ScanlationGroup,
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const inLib = manga ? isInLibrary(manga.id) : false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setSelectedGroupId(null);
    Promise.all([getMangaDetails(id), getMangaChapters(id)])
      .then(([m, ch]) => {
        setManga(m);
        setChapters(ch);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const groups = useMemo(() => extractGroups(chapters), [chapters]);

  const filteredChapters = useMemo(() => {
    if (!selectedGroupId) return chapters;
    return chapters.filter((ch) => getChapterGroup(ch)?.id === selectedGroupId);
  }, [chapters, selectedGroupId]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  const handleBookmark = () => {
    if (!manga) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLibrary(manga);
  };

  const handleSelectGroup = (group: ScanlationGroup | null) => {
    Haptics.selectionAsync();
    setSelectedGroupId(group?.id ?? null);
    setShowGroupPicker(false);
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
          onPress={() => { setLoading(true); setError(false); }}
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
        {/* ── HERO ── */}
        <View style={styles.hero}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.backdrop} contentFit="cover" />
          ) : null}
          <LinearGradient
            colors={["rgba(15,15,15,0.1)", "rgba(15,15,15,0.85)", "#0F0F0F"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + 56 }]}>
            <View style={[styles.coverShadow, { borderRadius: colors.radius, shadowColor: colors.primary }]}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={[styles.cover, { borderRadius: colors.radius }]} contentFit="cover" />
              ) : (
                <View style={[styles.cover, { backgroundColor: colors.card, borderRadius: colors.radius }]} />
              )}
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={3}>{title}</Text>
              {author ? (
                <Text style={[styles.heroAuthor, { color: colors.mutedForeground }]}>{author}</Text>
              ) : null}
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: status === "ongoing" ? colors.primary : colors.secondary }]}>
                  <Text style={[styles.statusText, { color: status === "ongoing" ? "#fff" : colors.foreground }]}>
                    {status === "ongoing" ? "مستمرة" : status === "completed" ? "مكتملة" : status === "hiatus" ? "متوقفة" : "ملغاة"}
                  </Text>
                </View>
                {manga.attributes.year ? (
                  <Text style={[styles.year, { color: colors.mutedForeground }]}>{manga.attributes.year}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── ACTIONS ── */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1, flex: 1, borderRadius: colors.radius },
              ]}
              onPress={() => {
                const first = filteredChapters[filteredChapters.length - 1];
                if (!first) return;
                const isExternal = first.attributes.pages === 0 && !!first.attributes.externalUrl;
                if (isExternal && first.attributes.externalUrl) {
                  Linking.openURL(first.attributes.externalUrl);
                } else {
                  router.push(`/reader/${first.id}` as any);
                }
              }}
            >
              <Feather name="book-open" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>ابدأ القراءة</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: inLib ? colors.primary : colors.card, opacity: pressed ? 0.8 : 1, borderRadius: colors.radius },
              ]}
              onPress={handleBookmark}
            >
              <Feather name="bookmark" size={22} color={inLib ? "#fff" : colors.foreground} />
            </Pressable>
          </View>

          {/* ── TAGS ── */}
          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderRadius: 6 }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── DESCRIPTION ── */}
          {description ? (
            <View style={styles.descSection}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>القصة</Text>
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>{description}</Text>
            </View>
          ) : null}

          {/* ── CHAPTERS HEADER + GROUP PICKER ── */}
          <View style={styles.chaptersHeader}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              الفصول ({filteredChapters.length})
            </Text>

            {groups.length > 1 && (
              <Pressable
                style={({ pressed }) => [
                  styles.groupBtn,
                  {
                    backgroundColor: selectedGroup ? colors.primary + "22" : colors.card,
                    borderRadius: 10,
                    opacity: pressed ? 0.75 : 1,
                    borderWidth: selectedGroup ? 1 : 0,
                    borderColor: selectedGroup ? colors.primary : "transparent",
                  },
                ]}
                onPress={() => setShowGroupPicker(true)}
              >
                <Feather name="users" size={13} color={selectedGroup ? colors.primary : colors.mutedForeground} />
                <Text
                  style={[
                    styles.groupBtnText,
                    { color: selectedGroup ? colors.primary : colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {selectedGroup ? selectedGroup.name : "فريق الترجمة"}
                </Text>
                <Feather name="chevron-down" size={13} color={selectedGroup ? colors.primary : colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── CHAPTER LIST ── */}
        {filteredChapters.length === 0 ? (
          <View style={styles.noChapters}>
            <Feather name="inbox" size={40} color={colors.muted} />
            <Text style={[styles.noChaptersText, { color: colors.mutedForeground }]}>
              {selectedGroup ? `لا توجد فصول لـ ${selectedGroup.name}` : "لا تتوفر فصول"}
            </Text>
            {selectedGroup && (
              <Pressable onPress={() => setSelectedGroupId(null)}>
                <Text style={[styles.resetGroup, { color: colors.primary }]}>عرض الكل</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredChapters.map((ch) => (
            <ChapterItem key={ch.id} chapter={ch} manga={manga ?? undefined} />
          ))
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>

      {/* ── BACK BUTTON ── */}
      <View style={[styles.backBtn, { top: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backPressable, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* ── GROUP PICKER MODAL ── */}
      <Modal
        visible={showGroupPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGroupPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
                {/* Modal handle */}
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  اختر فريق الترجمة
                </Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
                  {groups.length} فريق متاح
                </Text>

                <ScrollView
                  style={styles.groupList}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* "All" option */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.groupOption,
                      {
                        backgroundColor:
                          !selectedGroupId
                            ? colors.primary + "18"
                            : pressed
                            ? colors.secondary
                            : "transparent",
                        borderRadius: 12,
                      },
                    ]}
                    onPress={() => handleSelectGroup(null)}
                  >
                    <View style={[styles.groupOptionIcon, { backgroundColor: colors.primary + "22" }]}>
                      <Feather name="layers" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.groupOptionInfo}>
                      <Text style={[styles.groupOptionName, { color: colors.foreground }]}>
                        جميع الفرق
                      </Text>
                      <Text style={[styles.groupOptionCount, { color: colors.mutedForeground }]}>
                        {chapters.length} فصل
                      </Text>
                    </View>
                    {!selectedGroupId && (
                      <Feather name="check-circle" size={20} color={colors.primary} />
                    )}
                  </Pressable>

                  {/* Individual groups */}
                  {groups.map((group) => {
                    const count = chapters.filter((ch) => getChapterGroup(ch)?.id === group.id).length;
                    const isActive = selectedGroupId === group.id;
                    return (
                      <Pressable
                        key={group.id}
                        style={({ pressed }) => [
                          styles.groupOption,
                          {
                            backgroundColor: isActive
                              ? colors.primary + "18"
                              : pressed
                              ? colors.secondary
                              : "transparent",
                            borderRadius: 12,
                          },
                        ]}
                        onPress={() => handleSelectGroup(group)}
                      >
                        <View style={[styles.groupOptionIcon, { backgroundColor: isActive ? colors.primary + "22" : colors.background }]}>
                          <Feather name="users" size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                        </View>
                        <View style={styles.groupOptionInfo}>
                          <Text
                            style={[styles.groupOptionName, { color: isActive ? colors.primary : colors.foreground }]}
                            numberOfLines={2}
                          >
                            {group.name}
                          </Text>
                          <Text style={[styles.groupOptionCount, { color: colors.mutedForeground }]}>
                            {count} فصل
                          </Text>
                        </View>
                        {isActive && (
                          <Feather name="check-circle" size={20} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 15 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "600" },
  hero: { height: 340, position: "relative", overflow: "hidden" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  coverShadow: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  cover: { width: 110, height: 156 },
  heroInfo: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#fff", lineHeight: 26 },
  heroAuthor: { fontSize: 13, fontWeight: "500" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
  year: { fontSize: 13 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  actions: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  iconBtn: { width: 48, alignItems: "center", justifyContent: "center" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: "500" },
  descSection: { gap: 8 },
  sectionLabel: { fontSize: 17, fontWeight: "700" },
  desc: { fontSize: 14, lineHeight: 22 },
  chaptersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  groupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 170,
  },
  groupBtnText: { fontSize: 12, fontWeight: "600", flex: 1 },
  noChapters: { padding: 32, alignItems: "center", gap: 10 },
  noChaptersText: { fontSize: 14, textAlign: "center" },
  resetGroup: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  backBtn: { position: "absolute", left: 14 },
  backPressable: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: "75%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalSub: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 12 },
  groupList: { marginTop: 4 },
  groupOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 4,
  },
  groupOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  groupOptionInfo: { flex: 1, gap: 2 },
  groupOptionName: { fontSize: 14, fontWeight: "600" },
  groupOptionCount: { fontSize: 12 },
});
