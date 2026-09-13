"use no memo";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTeam } from "@/context/TeamContext";
import { MANGA_GENRES } from "@/lib/genres";

const API_BASE =
  typeof process !== "undefined" &&
  (process.env["EXPO_PUBLIC_API_DOMAIN"] || process.env["EXPO_PUBLIC_DOMAIN"])
    ? `https://${process.env["EXPO_PUBLIC_API_DOMAIN"] || process.env["EXPO_PUBLIC_DOMAIN"]}/api`
    : "/api";

async function requestUploadUrl(): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch(`${API_BASE}/rorym/uploads/request-url`, { method: "POST" });
  if (!res.ok) throw new Error("presigned URL error");
  return res.json() as Promise<{ uploadURL: string; objectPath: string }>;
}

async function uploadImageToGcs(presignedUrl: string, localUri: string): Promise<void> {
  const fileRes = await fetch(localUri);
  const blob = await fileRes.blob();
  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": blob.type || "image/jpeg" },
  });
  if (!uploadRes.ok) throw new Error("upload failed");
}

function objectPathToServingUrl(objectPath: string): string {
  // objectPath: /objects/uploads/uuid
  // serving:    {API_BASE}/rorym/images/uploads/uuid
  const suffix = objectPath.replace(/^\/objects\//, "");
  return `${API_BASE}/rorym/images/${suffix}`;
}

async function uploadSingleImage(localUri: string): Promise<string> {
  const { uploadURL, objectPath } = await requestUploadUrl();
  await uploadImageToGcs(uploadURL, localUri);
  return objectPathToServingUrl(objectPath);
}

export default function RorymUploadScreen() {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { team } = useTeam();

  // Manga fields
  const [mangaTitle, setMangaTitle] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [isMostRead, setIsMostRead] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);

  // Chapter fields
  const [chapterNum, setChapterNum] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [pageUris, setPageUris] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("صلاحيات", "يرجى السماح بالوصول إلى الصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const pickPages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("صلاحيات", "يرجى السماح بالوصول إلى الصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      orderedSelection: true,
    });
    if (!result.canceled) {
      setPageUris(result.assets.map((a) => a.uri));
    }
  };

  const handleSubmit = async () => {
    if (!mangaTitle.trim()) { Alert.alert("خطأ", "أدخل عنوان المانجا"); return; }
    if (!chapterNum.trim()) { Alert.alert("خطأ", "أدخل رقم الفصل"); return; }
    if (pageUris.length === 0) { Alert.alert("خطأ", "اختر صور الفصل"); return; }
    if (!team) { Alert.alert("خطأ", "يجب أن تكون في فريق ترجمة"); return; }

    setUploading(true);
    try {
      // 1. Upload cover if provided
      let coverUrl = "";
      if (coverUri) {
        setUploadStep("جارٍ رفع الغلاف...");
        coverUrl = await uploadSingleImage(coverUri);
      }

      // 2. Create manga (or get existing slug from response)
      setUploadStep("جارٍ إنشاء المانجا...");
      const mangaRes = await fetch(`${API_BASE}/rorym/manga`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: mangaTitle.trim(),
          coverUrl,
          summary: summary.trim(),
          teamId: String(team.createdAt),
          teamName: team.name,
          isMostRead,
          genres,
        }),
      });
      if (!mangaRes.ok) throw new Error("create manga failed");
      const { manga } = await mangaRes.json() as { manga: { slug: string } };

      // 3. Upload chapter pages
      setUploadStep(`جارٍ رفع ${pageUris.length} صفحة...`);
      const uploadedPages: string[] = [];
      for (let i = 0; i < pageUris.length; i++) {
        setUploadStep(`جارٍ رفع الصفحة ${i + 1} من ${pageUris.length}...`);
        const url = await uploadSingleImage(pageUris[i]!);
        uploadedPages.push(url);
      }

      // 4. Create chapter
      setUploadStep("جارٍ حفظ الفصل...");
      const chapRes = await fetch(`${API_BASE}/rorym/manga/${manga.slug}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterNum: chapterNum.trim(),
          title: chapterTitle.trim(),
          pages: uploadedPages,
        }),
      });
      if (!chapRes.ok) throw new Error("create chapter failed");

      Alert.alert("تم!", `تم رفع الفصل ${chapterNum} بنجاح في مكتبة روري م 📖`, [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("خطأ", "حدث خطأ أثناء الرفع، حاول مرة أخرى");
    } finally {
      setUploading(false);
      setUploadStep("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>رفع عمل جديد — روري م</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Section: Manga info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📚 معلومات المانجا</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>عنوان المانجا *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={mangaTitle}
            onChangeText={setMangaTitle}
            placeholder="أدخل عنوان المانجا"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>ملخص (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={summary}
            onChangeText={setSummary}
            placeholder="وصف قصير للمانجا"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>التصنيفات</Text>
          <Text style={[styles.genreHint, { color: colors.mutedForeground }]}>
            اختر كل التصنيفات التي تصف المانجا
          </Text>
          <View style={styles.genreGrid}>
            {MANGA_GENRES.map((genre) => {
              const selected = genres.includes(genre);
              return (
                <Pressable
                  key={genre}
                  style={[
                    styles.genreButton,
                    {
                      backgroundColor: selected ? colors.primary : colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() =>
                    setGenres((current) =>
                      current.includes(genre)
                        ? current.filter((item) => item !== genre)
                        : [...current, genre]
                    )
                  }
                >
                  <Text style={[styles.genreButtonText, { color: selected ? "#fff" : colors.foreground }]}>
                    {genre}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>غلاف المانجا</Text>
          <Pressable
            style={[styles.coverPicker, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={pickCover}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverPreview} contentFit="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Feather name="image" size={28} color={colors.mutedForeground} />
                <Text style={[styles.coverPickerText, { color: colors.mutedForeground }]}>اختر الغلاف</Text>
              </View>
            )}
          </Pressable>

          <View style={[styles.placementRow, { borderColor: colors.border }]}>
            <View style={styles.placementCopy}>
              <Text style={[styles.placementTitle, { color: colors.foreground }]}>
                إظهار في الأكثر قراءة
              </Text>
              <Text style={[styles.placementDescription, { color: colors.mutedForeground }]}>
                أضف هذا العمل إلى القسم المميز في الصفحة الرئيسية
              </Text>
            </View>
            <Switch
              value={isMostRead}
              onValueChange={setIsMostRead}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Section: Chapter info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📖 معلومات الفصل</Text>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>رقم الفصل *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={chapterNum}
            onChangeText={setChapterNum}
            placeholder="مثال: 1 أو 1.5"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            textAlign="right"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>عنوان الفصل (اختياري)</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={chapterTitle}
            onChangeText={setChapterTitle}
            placeholder="عنوان الفصل"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>صفحات الفصل *</Text>
          <Pressable
            style={[styles.pagesPicker, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={pickPages}
          >
            {pageUris.length === 0 ? (
              <View style={styles.pagesPlaceholder}>
                <Feather name="layers" size={24} color={colors.mutedForeground} />
                <Text style={[styles.pagesPickerText, { color: colors.mutedForeground }]}>
                  اختر صور الفصل (بالترتيب)
                </Text>
              </View>
            ) : (
              <View style={styles.pagesSelected}>
                <Feather name="check-circle" size={20} color={colors.primary} />
                <Text style={[styles.pagesSelectedText, { color: colors.primary }]}>
                  {pageUris.length} صورة محددة
                </Text>
                <Pressable onPress={pickPages} hitSlop={8}>
                  <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
          </Pressable>
        </View>

        {/* Team badge */}
        {team && (
          <View style={[styles.teamBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
            <Text style={styles.teamEmoji}>{team.emoji}</Text>
            <Text style={[styles.teamName, { color: colors.primary }]}>{team.name}</Text>
          </View>
        )}

        {/* Upload button */}
        <Pressable
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#fff" size={18} />
              <Text style={styles.submitBtnText}>{uploadStep || "جارٍ الرفع..."}</Text>
            </>
          ) : (
            <>
              <Feather name="upload-cloud" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>رفع الفصل إلى روري م</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  body: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  label: { fontSize: 12, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { height: 72, paddingTop: 10 },
  genreHint: { fontSize: 11, textAlign: "right" },
  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genreButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  genreButtonText: { fontSize: 12, fontWeight: "600" },
  coverPicker: {
    height: 140,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  coverPreview: { width: "100%", height: "100%" },
  coverPlaceholder: { alignItems: "center", gap: 6 },
  coverPickerText: { fontSize: 13 },
  placementRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  placementCopy: { flex: 1 },
  placementTitle: { fontSize: 14, fontWeight: "700", textAlign: "right" },
  placementDescription: { fontSize: 11, marginTop: 3, textAlign: "right" },
  pagesPicker: {
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    padding: 16,
  },
  pagesPlaceholder: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  pagesPickerText: { fontSize: 13 },
  pagesSelected: { flexDirection: "row", alignItems: "center", gap: 10 },
  pagesSelectedText: { flex: 1, fontSize: 14, fontWeight: "600" },
  teamBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  teamEmoji: { fontSize: 18 },
  teamName: { fontSize: 13, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
