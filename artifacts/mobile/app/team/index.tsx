import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTeam, type TeamManga } from "@/context/TeamContext";
import { useLibrary } from "@/context/LibraryContext";
import { useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { downloadTeamChapter, isChapterDownloaded, deleteTeamData } from "@/lib/download";
import { publishTeam, unpublishTeam, uploadTeamImage } from "@/lib/teams";

type Tab = "manga" | "members";
// ─── MangaCard ──────────────────────────────────────────────────────────────
function MangaCard({
  manga,
  refreshing,
  onRefresh,
}: {
  manga: TeamManga;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { removeManga, addChapter, removeChapter } = useTeam();
  const { isInLocalLibrary, addToLocalLibrary, removeFromLocalLibrary } = useLibrary();
  const { refreshMeta } = useDownloads();

  const [expanded, setExpanded] = useState(false);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapNum, setChapNum] = useState("");
  const [chapTitle, setChapTitle] = useState("");
  const [chapImages, setChapImages] = useState<string[]>([]);
  const [pickingImages, setPickingImages] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const coverSrc = manga.localCoverUri ?? manga.coverUrl;
  const chapters = manga.chapters ?? [];
  const inLibrary = isInLocalLibrary(manga.id);

  const handleToggleLibrary = () => {
    if (inLibrary) {
      removeFromLocalLibrary(manga.id);
    } else {
      addToLocalLibrary(manga);
    }
    Haptics.selectionAsync();
  };

  const handleDownloadChapter = async (ch: (typeof chapters)[0]) => {
    if (!ch.imageUris || ch.imageUris.length === 0) {
      Alert.alert("لا توجد صور", "أضف صور الفصل أولاً ثم حاول التنزيل.");
      return;
    }
    setDownloadingId(ch.id);
    try {
      await downloadTeamChapter(
        { id: ch.id, imageUris: ch.imageUris, number: ch.number },
        manga,
        () => {}
      );
      await refreshMeta();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم التنزيل", `فصل ${ch.number} جاهز للقراءة بدون إنترنت.`);
    } catch (e) {
      Alert.alert("خطأ", "تعذّر تنزيل الفصل.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePickChapterImages = async () => {
    setPickingImages(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("الإذن مرفوض", "يرجى السماح للتطبيق بالوصول إلى الصور من الإعدادات.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.85,
        orderedSelection: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        setChapImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
        Haptics.selectionAsync();
      }
    } finally {
      setPickingImages(false);
    }
  };

  const handleRemoveChapImage = (idx: number) => {
    setChapImages((prev) => prev.filter((_, i) => i !== idx));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddChapter = () => {
    if (!chapNum.trim()) return;
    addChapter(manga.id, {
      number: chapNum.trim(),
      title: chapTitle.trim(),
      imageUris: chapImages.length > 0 ? chapImages : undefined,
    });
    setChapNum("");
    setChapTitle("");
    setChapImages([]);
    setShowChapterForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.mangaCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
      {/* ── Row ── */}
      <Pressable
        style={styles.mangaRow}
        onPress={() => { setExpanded((v) => !v); Haptics.selectionAsync(); }}
      >
        {coverSrc ? (
          <Image source={{ uri: coverSrc }} style={styles.mangaCover} contentFit="cover" />
        ) : (
          <View style={[styles.mangaCoverPlaceholder, { backgroundColor: colors.secondary }]}>
            <Feather name="book" size={18} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.mangaInfo}>
          <View style={styles.mangaTitleRow}>
            <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={2}>
              {manga.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تحديث فصول ${manga.title}`}
              disabled={refreshing}
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                onRefresh();
              }}
              style={[styles.refreshMangaButton, { backgroundColor: colors.primary + "18" }]}
            >
              {refreshing ? (
                <ActivityIndicator size={14} color={colors.primary} />
              ) : (
                <Feather name="refresh-cw" size={14} color={colors.primary} />
              )}
            </Pressable>
          </View>
          {manga.description ? (
            <Text style={[styles.mangaDesc, { color: colors.mutedForeground }]} numberOfLines={expanded ? 10 : 2}>
              {manga.description}
            </Text>
          ) : null}
          <View style={styles.chapterCountRow}>
            <Feather name="layers" size={11} color={colors.primary} />
            <Text style={[styles.chapterCount, { color: colors.primary }]}>
              {chapters.length} {chapters.length === 1 ? "فصل" : "فصول"}
            </Text>
          </View>
        </View>

        <View style={styles.mangaActions}>
          {/* Library toggle */}
          <Pressable
            hitSlop={8}
            onPress={(e) => { e.stopPropagation(); handleToggleLibrary(); }}
          >
            <Feather
              name="bookmark"
              size={18}
              color={inLibrary ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {/* ── Expanded section ── */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>

          {/* Chapters list */}
          {chapters.length > 0 && (
            <View style={styles.chapterList}>
              {chapters.map((ch, idx) => {
                const hasImages = ch.imageUris && ch.imageUris.length > 0;
                const isDownloading = downloadingId === ch.id;
                return (
                  <View
                    key={ch.id}
                    style={[
                      styles.chapterRow,
                      { borderBottomColor: colors.border },
                      idx === chapters.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    {/* Number badge */}
                    <View style={[styles.chapterNumBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.chapterNumText, { color: colors.primary }]}>
                        {ch.number}
                      </Text>
                    </View>

                    {/* Title + image count */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.chapterTitleText, { color: colors.foreground }]} numberOfLines={1}>
                        {ch.title || `فصل ${ch.number}`}
                      </Text>
                      {hasImages && (
                        <Text style={[styles.chapterImageCount, { color: colors.mutedForeground }]}>
                          {ch.imageUris!.length} صورة
                        </Text>
                      )}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.chapterActions}>
                      {/* Read */}
                      <Pressable
                        hitSlop={8}
                        style={[
                          styles.chapterActionBtn,
                          { backgroundColor: hasImages ? colors.primary + "18" : colors.secondary },
                        ]}
                        onPress={() => {
                          if (!hasImages) {
                            Alert.alert("لا توجد صور", "أضف صور الفصل أولاً للقراءة.");
                            return;
                          }
                          router.push(
                            `/team/reader?mangaId=${manga.id}&chapterId=${ch.id}` as any
                          );
                        }}
                      >
                        <Feather
                          name="book-open"
                          size={13}
                          color={hasImages ? colors.primary : colors.mutedForeground}
                        />
                      </Pressable>

                      {/* Download */}
                      <Pressable
                        hitSlop={8}
                        style={[styles.chapterActionBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => handleDownloadChapter(ch)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <ActivityIndicator size={13} color={colors.primary} />
                        ) : (
                          <Feather name="download" size={13} color={colors.mutedForeground} />
                        )}
                      </Pressable>

                      {/* Delete */}
                      <Pressable
                        hitSlop={8}
                        style={[styles.chapterActionBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          removeChapter(manga.id, ch.id);
                        }}
                      >
                        <Feather name="x" size={13} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Add chapter toggle */}
          <Pressable
            style={[styles.addChapterBtn, { borderColor: colors.primary }]}
            onPress={() => { setShowChapterForm((v) => !v); Haptics.selectionAsync(); }}
          >
            <Feather name={showChapterForm ? "x" : "plus"} size={14} color={colors.primary} />
            <Text style={[styles.addChapterBtnText, { color: colors.primary }]}>
              {showChapterForm ? "إلغاء" : "إضافة فصل"}
            </Text>
          </Pressable>

          {/* Chapter form */}
          {showChapterForm && (
            <View style={[styles.chapterForm, { backgroundColor: colors.secondary, borderRadius: 10 }]}>
              {/* Number + Title row */}
              <View style={styles.chapterFormRow}>
                <View style={styles.chapterNumField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>رقم الفصل *</Text>
                  <TextInput
                    style={[styles.numInput, { backgroundColor: colors.card, color: colors.foreground, borderRadius: 8 }]}
                    value={chapNum}
                    onChangeText={setChapNum}
                    placeholder="١"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    textAlign="center"
                    maxLength={6}
                  />
                </View>
                <View style={styles.chapterTitleField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>عنوان الفصل</Text>
                  <TextInput
                    style={[styles.titleInput, { backgroundColor: colors.card, color: colors.foreground, borderRadius: 8 }]}
                    value={chapTitle}
                    onChangeText={setChapTitle}
                    placeholder="اختياري"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="right"
                    maxLength={80}
                  />
                </View>
              </View>

              {/* Images section */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  صور الفصل {chapImages.length > 0 ? `(${chapImages.length})` : ""}
                </Text>

                {/* Picked images grid */}
                {chapImages.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imagesScrollContent}
                  >
                    {chapImages.map((uri, idx) => (
                      <View key={uri + idx} style={styles.chapImageWrap}>
                        <Image source={{ uri }} style={styles.chapImageThumb} contentFit="cover" />
                        {/* Order badge */}
                        <View style={[styles.chapImageBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.chapImageBadgeText}>{idx + 1}</Text>
                        </View>
                        {/* Remove button */}
                        <Pressable
                          style={[styles.chapImageRemove, { backgroundColor: "rgba(0,0,0,0.55)" }]}
                          onPress={() => handleRemoveChapImage(idx)}
                          hitSlop={4}
                        >
                          <Feather name="x" size={11} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Pick images button */}
                <Pressable
                  style={[styles.pickImagesBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 8 }]}
                  onPress={handlePickChapterImages}
                  disabled={pickingImages}
                >
                  {pickingImages ? (
                    <ActivityIndicator size={16} color={colors.primary} />
                  ) : (
                    <Feather name="image" size={16} color={colors.primary} />
                  )}
                  <Text style={[styles.pickImagesBtnText, { color: colors.primary }]}>
                    {pickingImages
                      ? "جارٍ الاختيار..."
                      : chapImages.length > 0
                      ? "إضافة المزيد من الصور"
                      : "اختر صور الفصل من الاستوديو"}
                  </Text>
                </Pressable>
              </View>

              {/* Save button */}
              <Pressable
                style={[
                  styles.saveChapterBtn,
                  { backgroundColor: colors.primary, borderRadius: 8, opacity: chapNum.trim() ? 1 : 0.45 },
                ]}
                onPress={handleAddChapter}
                disabled={!chapNum.trim()}
              >
                <Feather name="check" size={15} color="#fff" />
                <Text style={styles.saveChapterBtnText}>حفظ الفصل</Text>
              </Pressable>
            </View>
          )}

          {/* Delete manga */}
          <Pressable
            style={styles.deleteMangaBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              removeManga(manga.id);
            }}
          >
            <Feather name="trash-2" size={13} color="#EF4444" />
            <Text style={styles.deleteMangaBtnText}>حذف المانجا</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── TeamScreen ──────────────────────────────────────────────────────────────
export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { team, deleteTeam, addMember, removeMember, addManga } = useTeam();
  const { removeFromLocalLibrary } = useLibrary();

  const [tab, setTab] = useState<Tab>("manga");

  // Add-manga panel
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Manual add
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCoverUri, setManualCoverUri] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);

  // Manga filter
  const [mangaFilter, setMangaFilter] = useState("");

  // Publish
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [refreshingMangaId, setRefreshingMangaId] = useState<string | null>(null);

  // Members
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");

  const resetAddPanel = () => {
    setShowAddPanel(false);
    setManualTitle("");
    setManualDesc("");
    setManualCoverUri(null);
  };

  if (!team) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>فريق الترجمة</Text>
          <Pressable onPress={() => router.push("/teams" as any)} hitSlop={8}>
            <Feather name="compass" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View style={styles.emptyCenter}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="users" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد فريق بعد</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            أنشئ فريق ترجمة خاصاً بك وابدأ بإضافة المانجا
          </Text>
          <Pressable
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/team/create")}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.createBtnText}>إنشاء فريق</Text>
          </Pressable>
          <Pressable
            style={[styles.discoverBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/teams" as any)}
          >
            <Feather name="compass" size={16} color={colors.mutedForeground} />
            <Text style={[styles.discoverBtnText, { color: colors.mutedForeground }]}>
              استكشف فرق الترجمة
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handlePickImage = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("الإذن مرفوض", "يرجى السماح للتطبيق بالوصول إلى الصور من الإعدادات.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setManualCoverUri(result.assets[0].uri);
        Haptics.selectionAsync();
      }
    } finally {
      setPickingImage(false);
    }
  };

  const handleAddManual = () => {
    if (!manualTitle.trim()) return;
    addManga({
      id: `manual_${Date.now()}`,
      title: manualTitle.trim(),
      description: manualDesc.trim() || undefined,
      localCoverUri: manualCoverUri ?? undefined,
    });
    resetAddPanel();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const performDeleteTeam = async () => {
    if (!team) return;
    // 1. إلغاء النشر من الخادم إذا كان الفريق منشوراً
    if (isPublished) {
      try { await unpublishTeam(team.name + "_" + team.createdAt); } catch { /* لا نوقف الحذف */ }
    }
    // 2. حذف الفصول المحمّلة محلياً لكل مانجا في الفريق
    try { await deleteTeamData(team); } catch { /* لا نوقف الحذف */ }
    // 3. إزالة كل مانجا الفريق من المكتبة المحلية
    for (const m of team.manga) {
      removeFromLocalLibrary(m.id);
    }
    // 4. حذف بيانات الفريق من AsyncStorage
    deleteTeam();
    router.back();
  };

  const handleDeleteTeam = () => {
    if (Platform.OS === "web") { void performDeleteTeam(); return; }
    Alert.alert(
      "حذف الفريق",
      "سيتم حذف الفريق وجميع الفصول المحمّلة ومسح النشر. لا يمكن التراجع.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: () => { void performDeleteTeam(); } },
      ]
    );
  };

  const publishCurrentTeam = async () => {
    if (!team) return;
    const publicManga = await Promise.all(team.manga.map(async (m) => {
      const chapters = await Promise.all((m.chapters ?? []).map(async (ch) => {
        let imageUrls: string[] | undefined;
        if (ch.imageUris && ch.imageUris.length > 0) {
          try {
            imageUrls = await Promise.all(
              ch.imageUris.map((uri) => uploadTeamImage(uri, ""))
            );
          } catch {
            imageUrls = undefined;
          }
        }
        return {
          id: ch.id,
          number: ch.number,
          title: ch.title,
          imageCount: ch.imageUris?.length ?? 0,
          ...(imageUrls ? { imageUrls } : {}),
        };
      }));
      return {
        id: m.id,
        title: m.title,
        coverUrl: m.coverUrl,
        description: m.description,
        chapters,
      };
    }));
    await publishTeam({
      id: team.name + "_" + team.createdAt,
      name: team.name,
      description: team.description ?? "",
      emoji: team.emoji,
      manga: publicManga,
    });
    setIsPublished(true);
  };

  const handleRefreshManga = async (manga: TeamManga) => {
    setRefreshingMangaId(manga.id);
    try {
      await publishCurrentTeam();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("تم التحديث", `تم تحديث فصول ${manga.title} لزوار فريق الترجمة.`);
    } catch {
      Alert.alert("تعذّر التحديث", "تحقق من اتصالك ثم حاول مرة أخرى.");
    } finally {
      setRefreshingMangaId(null);
    }
  };

  const handlePublishToggle = async () => {
    if (!team) return;
    setPublishing(true);
    try {
      if (isPublished) {
        await unpublishTeam(team.name + "_" + team.createdAt);
        setIsPublished(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم إلغاء النشر", "لم يعد فريقك مرئياً للآخرين.");
      } else {
        await publishCurrentTeam();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم النشر! 🎉", "فريقك الآن مرئي لجميع المستخدمين.");
      }
    } catch {
      Alert.alert("خطأ", "تعذّر الاتصال بالخادم. تحقق من اتصالك وأعد المحاولة.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>فريق الترجمة</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* Discover teams */}
          <Pressable onPress={() => router.push("/teams" as any)} hitSlop={8}>
            <Feather name="compass" size={20} color={colors.mutedForeground} />
          </Pressable>
          {/* Publish toggle */}
          <Pressable onPress={handlePublishToggle} hitSlop={8} disabled={publishing}>
            {publishing
              ? <ActivityIndicator size={18} color={colors.primary} />
              : <Feather name="globe" size={20} color={isPublished ? colors.primary : colors.mutedForeground} />
            }
          </Pressable>
          {/* Edit */}
          <Pressable onPress={() => router.push("/team/create")} hitSlop={8}>
            <Feather name="edit-2" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Team card */}
        <View style={[styles.teamCard, { backgroundColor: colors.card, borderRadius: colors.radius, marginHorizontal: 16 }]}>
          <View style={styles.teamCardRow}>
            <View style={[styles.teamEmoji, { backgroundColor: colors.primary + "18" }]}>
              <Text style={styles.teamEmojiText}>{team.emoji}</Text>
            </View>
            <View style={styles.teamCardInfo}>
              <Text style={[styles.teamName, { color: colors.foreground }]}>{team.name}</Text>
              {team.description ? (
                <Text style={[styles.teamDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {team.description}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.teamStats, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{team.manga.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>مانجا</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>
                {team.manga.reduce((s, m) => s + (m.chapters?.length ?? 0), 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>فصول</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{team.members.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>أعضاء</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.statItem} onPress={handleDeleteTeam}>
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text style={[styles.statLabel, { color: "#EF4444" }]}>حذف</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
          {(["manga", "members"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && { backgroundColor: colors.primary, borderRadius: colors.radius - 2 }]}
              onPress={() => { Haptics.selectionAsync(); setTab(t); }}
            >
              <Feather
                name={t === "manga" ? "book-open" : "users"}
                size={15}
                color={tab === t ? "#fff" : colors.mutedForeground}
              />
              <Text style={[styles.tabLabel, { color: tab === t ? "#fff" : colors.mutedForeground }]}>
                {t === "manga" ? "المانجا" : "الأعضاء"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── MANGA TAB ── */}
        {tab === "manga" && (
          <View style={{ marginHorizontal: 16, marginTop: 12, gap: 8 }}>

            {/* Add manga toggle */}
            <Pressable
              style={[styles.addRowBtn, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.primary }]}
              onPress={() => { showAddPanel ? resetAddPanel() : setShowAddPanel(true); }}
            >
              <Feather name={showAddPanel ? "x" : "plus"} size={16} color={colors.primary} />
              <Text style={[styles.addRowBtnText, { color: colors.primary }]}>
                {showAddPanel ? "إغلاق" : "إضافة مانجا"}
              </Text>
            </Pressable>

            {/* Add panel */}
            {showAddPanel && (
              <View style={[styles.addPanel, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                <View style={{ gap: 12, marginTop: 8 }}>
                    {/* Cover */}
                    <View style={{ alignItems: "center", gap: 8 }}>
                      <Pressable
                        style={[styles.coverPickerBtn, { backgroundColor: colors.secondary, borderRadius: 10, borderColor: colors.border }]}
                        onPress={handlePickImage}
                        disabled={pickingImage}
                      >
                        {manualCoverUri ? (
                          <Image source={{ uri: manualCoverUri }} style={styles.coverPreview} contentFit="cover" />
                        ) : (
                          <View style={styles.coverPlaceholder}>
                            {pickingImage
                              ? <ActivityIndicator color={colors.primary} />
                              : <>
                                  <Feather name="image" size={28} color={colors.mutedForeground} />
                                  <Text style={[styles.coverPlaceholderText, { color: colors.mutedForeground }]}>اختر صورة الغلاف</Text>
                                </>
                            }
                          </View>
                        )}
                      </Pressable>
                      {manualCoverUri && (
                        <Pressable
                          style={[styles.removeCoverBtn, { backgroundColor: colors.secondary }]}
                          onPress={() => setManualCoverUri(null)}
                        >
                          <Feather name="x" size={14} color={colors.mutedForeground} />
                          <Text style={[styles.removeCoverText, { color: colors.mutedForeground }]}>إزالة الصورة</Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Title */}
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>اسم المانجا *</Text>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: colors.secondary, color: colors.foreground, borderRadius: 10 }]}
                        value={manualTitle}
                        onChangeText={setManualTitle}
                        placeholder="مثال: ناروتو"
                        placeholderTextColor={colors.mutedForeground}
                        textAlign="right"
                        maxLength={80}
                      />
                    </View>

                    {/* Description */}
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ملخص القصة</Text>
                      <TextInput
                        style={[styles.fieldInputMulti, { backgroundColor: colors.secondary, color: colors.foreground, borderRadius: 10 }]}
                        value={manualDesc}
                        onChangeText={setManualDesc}
                        placeholder="اكتب ملخصاً قصيراً عن أحداث المانجا..."
                        placeholderTextColor={colors.mutedForeground}
                        textAlign="right"
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        textAlignVertical="top"
                      />
                      <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{manualDesc.length} / 500</Text>
                    </View>

                    <Pressable
                      style={[styles.manualAddBtn, { backgroundColor: colors.primary, borderRadius: 10, opacity: manualTitle.trim() ? 1 : 0.45 }]}
                      onPress={handleAddManual}
                      disabled={!manualTitle.trim()}
                    >
                      <Feather name="plus-circle" size={16} color="#fff" />
                      <Text style={styles.manualAddBtnText}>إضافة المانجا</Text>
                    </Pressable>
                </View>
              </View>
            )}

            {/* Manga filter search */}
            {team.manga.length > 0 && (
              <View style={[styles.filterBox, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
                <Feather name="search" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.filterInput, { color: colors.foreground }]}
                  value={mangaFilter}
                  onChangeText={setMangaFilter}
                  placeholder="ابحث في مانجا فريقك..."
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
                {mangaFilter.length > 0 && (
                  <Pressable hitSlop={8} onPress={() => setMangaFilter("")}>
                    <Feather name="x" size={15} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Manga list */}
            {team.manga.length === 0 ? (
              <View style={styles.emptyTab}>
                <Feather name="book-open" size={32} color={colors.muted} />
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>لا توجد مانجا بعد</Text>
              </View>
            ) : (() => {
              const filtered = mangaFilter.trim()
                ? team.manga.filter((m) =>
                    m.title.toLowerCase().includes(mangaFilter.toLowerCase())
                  )
                : team.manga;
              if (filtered.length === 0) {
                return (
                  <View style={styles.emptyTab}>
                    <Feather name="search" size={28} color={colors.muted} />
                    <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>
                      لا توجد نتائج لـ «{mangaFilter}»
                    </Text>
                  </View>
                );
              }
              return filtered.map((m) => (
                <MangaCard
                  key={m.id}
                  manga={m}
                  refreshing={refreshingMangaId === m.id}
                  onRefresh={() => void handleRefreshManga(m)}
                />
              ));
            })()}
          </View>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === "members" && (
          <View style={{ marginHorizontal: 16, marginTop: 12, gap: 8 }}>
            <Pressable
              style={[styles.addRowBtn, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.primary }]}
              onPress={() => setShowAddMember((v) => !v)}
            >
              <Feather name={showAddMember ? "x" : "user-plus"} size={16} color={colors.primary} />
              <Text style={[styles.addRowBtnText, { color: colors.primary }]}>
                {showAddMember ? "إلغاء" : "إضافة عضو"}
              </Text>
            </Pressable>

            {showAddMember && (
              <View style={[styles.memberForm, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                <TextInput
                  style={[styles.memberInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  value={memberName}
                  onChangeText={setMemberName}
                  placeholder="اسم العضو"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
                <TextInput
                  style={[styles.memberInput, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  value={memberRole}
                  onChangeText={setMemberRole}
                  placeholder="الدور (مترجم، مراجع، ...)"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
                <Pressable
                  style={[styles.memberAddBtn, { backgroundColor: colors.primary, opacity: memberName.trim() ? 1 : 0.5 }]}
                  disabled={!memberName.trim()}
                  onPress={() => {
                    addMember({ name: memberName.trim(), role: memberRole.trim() || "عضو" });
                    setMemberName(""); setMemberRole(""); setShowAddMember(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                >
                  <Text style={styles.memberAddBtnText}>إضافة</Text>
                </Pressable>
              </View>
            )}

            {team.members.length === 0 ? (
              <View style={styles.emptyTab}>
                <Feather name="users" size={32} color={colors.muted} />
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>لا يوجد أعضاء بعد</Text>
              </View>
            ) : (
              team.members.map((m) => (
                <View key={m.id} style={[styles.memberRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name="user" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.memberInfoBlock}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                    <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>{m.role}</Text>
                  </View>
                  <Pressable onPress={() => removeMember(m.id)} hitSlop={8}>
                    <Feather name="x" size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyIconBox: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  createBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  teamCard: { overflow: "hidden", marginTop: 8 },
  teamCardRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  teamEmoji: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  teamEmojiText: { fontSize: 28 },
  teamCardInfo: { flex: 1, gap: 4 },
  teamName: { fontSize: 18, fontWeight: "700" },
  teamDesc: { fontSize: 13, lineHeight: 18 },
  teamStats: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: StyleSheet.hairlineWidth },

  tabBar: { flexDirection: "row", padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  addRowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1.5, borderStyle: "dashed" },
  addRowBtnText: { fontSize: 14, fontWeight: "600" },

  addPanel: { padding: 14 },
  modeSwitcher: { flexDirection: "row", padding: 4, gap: 4 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9 },
  modeBtnText: { fontSize: 13, fontWeight: "600" },

  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  resultCover: { width: 40, height: 56, borderRadius: 6 },
  resultCoverPlaceholder: { width: 40, height: 56, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  resultTitle: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },

  coverPickerBtn: { borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", overflow: "hidden", width: 120, height: 160 },
  coverPreview: { width: 120, height: 160 },
  coverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  coverPlaceholderText: { fontSize: 11, textAlign: "center", paddingHorizontal: 6 },
  removeCoverBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  removeCoverText: { fontSize: 12, fontWeight: "500" },

  fieldLabel: { fontSize: 12, fontWeight: "600", textAlign: "right" },
  fieldInput: { height: 46, paddingHorizontal: 12, fontSize: 14 },
  fieldInputMulti: { minHeight: 100, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  charCount: { fontSize: 11, textAlign: "left" },
  manualAddBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  manualAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // MangaCard
  mangaCard: { overflow: "hidden" },
  mangaRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  mangaCover: { width: 52, height: 72, borderRadius: 8 },
  mangaCoverPlaceholder: { width: 52, height: 72, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  mangaInfo: { flex: 1, gap: 4 },
  mangaTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  mangaTitle: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  refreshMangaButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  mangaDesc: { fontSize: 12, lineHeight: 17 },
  chapterCountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  chapterCount: { fontSize: 11, fontWeight: "600" },
  mangaActions: { flexDirection: "row", gap: 10, alignItems: "center" },

  expandedSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, gap: 8 },

  chapterList: { borderRadius: 10, overflow: "hidden" },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chapterNumBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 36, alignItems: "center" },
  chapterNumText: { fontSize: 12, fontWeight: "700" },
  chapterTitleText: { fontSize: 13, lineHeight: 18 },
  chapterImageCount: { fontSize: 10, marginTop: 1 },
  chapterActions: { flexDirection: "row", gap: 4, alignItems: "center" },
  chapterActionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  addChapterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
  },
  addChapterBtnText: { fontSize: 13, fontWeight: "600" },

  chapterForm: { padding: 12, gap: 10 },
  chapterFormRow: { flexDirection: "row", gap: 10 },
  chapterNumField: { width: 90, gap: 4 },
  chapterTitleField: { flex: 1, gap: 4 },
  numInput: { height: 42, paddingHorizontal: 8, fontSize: 16, fontWeight: "700" },
  titleInput: { height: 42, paddingHorizontal: 10, fontSize: 14 },
  saveChapterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  saveChapterBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  pickImagesBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  pickImagesBtnText: { fontSize: 13, fontWeight: "600" },
  imagesScrollContent: { gap: 8, paddingVertical: 2 },
  chapImageWrap: { width: 72, height: 96, borderRadius: 6, overflow: "hidden" },
  chapImageThumb: { width: 72, height: 96 },
  chapImageBadge: { position: "absolute", top: 4, left: 4, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  chapImageBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  chapImageRemove: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  deleteMangaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 6 },
  deleteMangaBtnText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },

  filterBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth },
  filterInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  // Members
  emptyTab: { paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyTabText: { fontSize: 14 },
  memberForm: { padding: 14, gap: 10 },
  memberInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  memberAddBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  memberAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  memberInfoBlock: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberRole: { fontSize: 12, marginTop: 2 },
  discoverBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  discoverBtnText: { fontSize: 14 },
});
