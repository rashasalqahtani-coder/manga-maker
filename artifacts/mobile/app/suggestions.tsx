import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { searchMangas, type UnifiedManga } from "@/lib/sources";
import {
  createSuggestion,
  deleteSuggestion,
  fetchSuggestions,
  fetchSuggestionReports,
  moderateSuggestion,
  reportSuggestion,
  type MangaSuggestion,
  type SuggestionReportReason,
  type SuggestionReportSummary,
} from "@/lib/suggestions";

function MangaPicker({
  label,
  value,
  manga,
  excludedSlug,
  onSelect,
}: {
  label: string;
  value: UnifiedManga | null;
  manga: UnifiedManga[];
  excludedSlug?: string;
  onSelect: (manga: UnifiedManga) => void;
}) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(
    () =>
      manga
        .filter((item) => item.slug !== excludedSlug)
        .filter((item) => !query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8),
    [manga, query, excludedSlug],
  );

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => setOpen((current) => !current)}
      >
        {value?.coverUrl ? <Image source={{ uri: value.coverUrl }} style={styles.selectorCover} /> : null}
        <Text style={[styles.selectorText, { color: value ? colors.foreground : colors.mutedForeground }]}>
          {value?.title ?? "اختر مانجا"}
        </Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </Pressable>
      {open && (
        <View style={[styles.pickerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.secondary }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث بالاسم..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              textAlign="right"
            />
          </View>
          {matches.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.pickerRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                onSelect(item);
                setOpen(false);
                setQuery("");
              }}
            >
              {item.coverUrl ? <Image source={{ uri: item.coverUrl }} style={styles.pickerCover} /> : null}
              <Text style={[styles.pickerTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          ))}
          {matches.length === 0 && (
            <Text style={[styles.noMatches, { color: colors.mutedForeground }]}>لا توجد نتائج</Text>
          )}
        </View>
      )}
    </View>
  );
}

function SuggestionCard({
  item,
  isOwner,
  onReport,
  onDelete,
}: {
  item: MangaSuggestion;
  isOwner: boolean;
  onReport: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const openManga = (slug: string, title: string, coverUrl?: string | null) =>
    router.push({
      pathname: "/starz/[slug]" as any,
      params: {
        slug,
        title: encodeURIComponent(title),
        coverUrl: encodeURIComponent(coverUrl ?? ""),
        src: "rorym",
      },
    });

  return (
    <View style={[styles.suggestionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.recommendationPair}>
        <Pressable style={styles.mangaSide} onPress={() => openManga(item.sourceSlug, item.sourceTitle, item.sourceCoverUrl)}>
          {item.sourceCoverUrl ? <Image source={{ uri: item.sourceCoverUrl }} style={styles.cardCover} /> : null}
          <Text style={[styles.sideCaption, { color: colors.mutedForeground }]}>إذا أعجبتك</Text>
          <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={2}>{item.sourceTitle}</Text>
        </Pressable>
        <View style={[styles.arrowCircle, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </View>
        <Pressable style={styles.mangaSide} onPress={() => openManga(item.suggestedSlug, item.suggestedTitle, item.suggestedCoverUrl)}>
          {item.suggestedCoverUrl ? <Image source={{ uri: item.suggestedCoverUrl }} style={styles.cardCover} /> : null}
          <Text style={[styles.sideCaption, { color: colors.primary }]}>اقرأ أيضاً</Text>
          <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={2}>{item.suggestedTitle}</Text>
        </Pressable>
      </View>
      <View style={[styles.reasonBox, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.reasonLabel, { color: colors.primary }]}>لماذا هذا الاقتراح؟</Text>
        <Text style={[styles.reason, { color: colors.foreground }]}>{item.reason}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.author, { color: colors.mutedForeground }]}>اقتراح من {item.userName}</Text>
        {isOwner ? (
          <Pressable onPress={onDelete} style={styles.smallAction}>
            <Feather name="trash-2" size={14} color={colors.destructive} />
            <Text style={[styles.smallActionText, { color: colors.destructive }]}>حذف</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onReport} style={styles.smallAction}>
            <Feather name="flag" size={14} color={colors.mutedForeground} />
            <Text style={[styles.smallActionText, { color: colors.mutedForeground }]}>إبلاغ</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function SuggestionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [manga, setManga] = useState<UnifiedManga[]>([]);
  const [suggestions, setSuggestions] = useState<MangaSuggestion[]>([]);
  const [reports, setReports] = useState<SuggestionReportSummary[]>([]);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [source, setSource] = useState<UnifiedManga | null>(null);
  const [suggested, setSuggested] = useState<UnifiedManga | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";

  useEffect(() => {
    Promise.all([searchMangas("rorym", ""), fetchSuggestions()])
      .then(([allManga, allSuggestions]) => {
        setManga(allManga);
        setSuggestions(allSuggestions);
      })
      .catch(() => Alert.alert("تعذر التحميل", "تحقق من اتصالك بالإنترنت ثم حاول مجدداً"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin || !isSignedIn) return;
    getToken()
      .then((token) => {
        if (token) return fetchSuggestionReports(token).then(setReports);
      })
      .catch(() => {});
  }, [getToken, isAdmin, isSignedIn]);

  const sendReport = async (reportReason: SuggestionReportReason) => {
    if (!reportingId) return;
    if (!isSignedIn) {
      setReportingId(null);
      router.push("/(auth)/sign-in");
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      await reportSuggestion(reportingId, reportReason, token);
      Alert.alert("تم استلام البلاغ", "ستراجعه الإدارة قريباً");
    } catch (error) {
      Alert.alert("تعذر الإبلاغ", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setReportingId(null);
    }
  };

  const removeSuggestion = (id: string) => {
    Alert.alert("حذف الاقتراح", "هل تريد حذف هذا الاقتراح نهائياً؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) return;
            await deleteSuggestion(id, token);
            setSuggestions((current) => current.filter((item) => item.id !== id));
            setReports((current) => current.filter((item) => item.suggestion.id !== id));
          } catch (error) {
            Alert.alert("تعذر الحذف", error instanceof Error ? error.message : "حاول مرة أخرى");
          }
        },
      },
    ]);
  };

  const moderate = async (id: string, action: "hide" | "restore" | "delete") => {
    try {
      const token = await getToken();
      if (!token) return;
      await moderateSuggestion(id, action, token);
      if (action === "delete") {
        setSuggestions((current) => current.filter((item) => item.id !== id));
        setReports((current) => current.filter((item) => item.suggestion.id !== id));
      } else {
        setReports((current) =>
          current.map((item) =>
            item.suggestion.id === id
              ? { ...item, suggestion: { ...item.suggestion, status: action === "hide" ? "hidden" : "visible" } }
              : item,
          ),
        );
        setSuggestions((current) =>
          action === "hide"
            ? current.filter((item) => item.id !== id)
            : current,
        );
      }
    } catch (error) {
      Alert.alert("تعذر تنفيذ الإجراء", error instanceof Error ? error.message : "حاول مرة أخرى");
    }
  };

  const submit = async () => {
    if (!isSignedIn) {
      router.push("/(auth)/sign-in");
      return;
    }
    if (!source || !suggested) {
      Alert.alert("اختيار المانجا", "اختر المانجا الأصلية والمانجا المقترحة");
      return;
    }
    if (reason.trim().length < 10) {
      Alert.alert("سبب الاقتراح", "اشرح سبب الاقتراح بعشر حروف على الأقل");
      return;
    }
    const token = await getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const created = await createSuggestion({
        source,
        suggested,
        reason,
        token,
        userName: user?.fullName || user?.username || "قارئ",
        userAvatar: user?.imageUrl,
      });
      setSuggestions((current) => [created, ...current]);
      setSource(null);
      setSuggested(null);
      setReason("");
      Alert.alert("تم النشر", "ظهر اقتراحك للقراء");
    } catch (error) {
      Alert.alert("تعذر النشر", error instanceof Error ? error.message : "حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Pressable style={[styles.back, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.foreground }]}>اقتراحات القرّاء</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>اكتشف مانجا تشبه أعمالك المفضلة</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SuggestionCard
              item={item}
              isOwner={item.userId === user?.id}
              onReport={() => setReportingId(item.id)}
              onDelete={() => removeSuggestion(item.id)}
            />
          )}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={
            <>
            {isAdmin && (
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.foreground }]}>بلاغات الاقتراحات</Text>
                {reports.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد بلاغات للمراجعة</Text>
                ) : reports.map((report) => (
                  <View key={report.suggestion.id} style={[styles.reportRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.reportTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {report.suggestion.sourceTitle} ← {report.suggestion.suggestedTitle}
                    </Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      {report.reportCount} بلاغات · {report.reasons.join("، ")}
                    </Text>
                    <View style={styles.reportActions}>
                      <Pressable style={[styles.adminButton, { backgroundColor: colors.secondary }]} onPress={() => moderate(report.suggestion.id, report.suggestion.status === "hidden" ? "restore" : "hide")}>
                        <Text style={[styles.adminButtonText, { color: colors.foreground }]}>{report.suggestion.status === "hidden" ? "إظهار" : "إخفاء"}</Text>
                      </Pressable>
                      <Pressable style={[styles.adminButton, { backgroundColor: colors.destructive }]} onPress={() => moderate(report.suggestion.id, "delete")}>
                        <Text style={styles.submitText}>حذف</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.formHeading}>
                <View style={[styles.sparkIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="compass" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formTitle, { color: colors.foreground }]}>أضف اقتراحاً</Text>
                  <Text style={[styles.formSub, { color: colors.mutedForeground }]}>ساعد القرّاء في اكتشاف عملهم القادم</Text>
                </View>
              </View>
              <MangaPicker label="إذا أعجبت القارئ" value={source} manga={manga} excludedSlug={suggested?.slug} onSelect={setSource} />
              <MangaPicker label="فاقترح عليه قراءة" value={suggested} manga={manga} excludedSlug={source?.slug} onSelect={setSuggested} />
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>اشرح سبب اقتراحك</Text>
                <TextInput
                  multiline
                  value={reason}
                  onChangeText={setReason}
                  maxLength={700}
                  placeholder="مثال: كلاهما يحتوي على مغامرات طويلة، صداقات قوية وعالم واسع..."
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                  textAlignVertical="top"
                  style={[styles.reasonInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border }]}
                />
                <Text style={[styles.counter, { color: colors.mutedForeground }]}>{reason.length}/700</Text>
              </View>
              <Pressable
                disabled={submitting}
                onPress={submit}
                style={({ pressed }) => [styles.submit, { backgroundColor: colors.primary, opacity: pressed || submitting ? 0.7 : 1 }]}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
                <Text style={styles.submitText}>{isSignedIn ? "نشر الاقتراح" : "سجّل الدخول للنشر"}</Text>
              </Pressable>
            </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={36} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>كن أول من يقترح</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لم يضف القرّاء اقتراحات بعد</Text>
            </View>
          }
        />
      )}
      <Modal visible={reportingId !== null} transparent animationType="fade" onRequestClose={() => setReportingId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReportingId(null)}>
          <Pressable style={[styles.reportModal, { backgroundColor: colors.card }]} onPress={() => {}}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>ما سبب الإبلاغ؟</Text>
            {([
              ["offensive", "محتوى مسيء"],
              ["spam", "إزعاج أو تكرار"],
              ["spoiler", "حرق للأحداث"],
              ["other", "سبب آخر"],
            ] as const).map(([value, label]) => (
              <Pressable key={value} style={[styles.reasonOption, { borderColor: colors.border }]} onPress={() => sendReport(value)}>
                <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, alignItems: "center", gap: 2 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 11 },
  headerSpacer: { width: 38 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 14 },
  formCard: { padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, gap: 15, marginBottom: 8 },
  formHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sparkIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  formTitle: { fontSize: 17, fontWeight: "800" },
  formSub: { fontSize: 11, marginTop: 2 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  selector: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  selectorCover: { width: 30, height: 40, borderRadius: 5 },
  selectorText: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "600" },
  pickerPanel: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  searchBox: { margin: 8, paddingHorizontal: 10, height: 40, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  searchInput: { flex: 1, fontSize: 13 },
  pickerRow: { minHeight: 50, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerCover: { width: 28, height: 38, borderRadius: 4 },
  pickerTitle: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "600" },
  noMatches: { padding: 18, textAlign: "center", fontSize: 12 },
  reasonInput: { minHeight: 110, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 20 },
  counter: { fontSize: 10, textAlign: "left" },
  submit: { height: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  suggestionCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 14, gap: 12 },
  recommendationPair: { flexDirection: "row", alignItems: "center", gap: 9 },
  mangaSide: { flex: 1, alignItems: "center", gap: 4 },
  cardCover: { width: 68, height: 96, borderRadius: 9 },
  sideCaption: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  mangaTitle: { fontSize: 12, fontWeight: "800", textAlign: "center", minHeight: 34 },
  arrowCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reasonBox: { borderRadius: 12, padding: 12, gap: 5 },
  reasonLabel: { fontSize: 11, fontWeight: "800", textAlign: "right" },
  reason: { fontSize: 13, lineHeight: 20, textAlign: "right" },
  author: { fontSize: 10, textAlign: "right" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallAction: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5 },
  smallActionText: { fontSize: 11, fontWeight: "700" },
  reportRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  reportTitle: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  reportActions: { flexDirection: "row", gap: 8 },
  adminButton: { flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  adminButtonText: { fontSize: 12, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  reportModal: { width: "100%", maxWidth: 420, borderRadius: 18, padding: 18, gap: 10 },
  reasonOption: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: 42, gap: 7 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyText: { fontSize: 12 },
});