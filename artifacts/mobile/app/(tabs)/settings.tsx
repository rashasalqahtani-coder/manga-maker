import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  tint?: string;
}

function SettingRow({ icon, label, value, toggle, toggleValue, onToggle, onPress, tint }: SettingRowProps) {
  const colors = useColors();
  const rowColor = tint ?? colors.primary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed && onPress ? colors.secondary : "transparent" },
      ]}
      onPress={onPress}
      disabled={!onPress && !toggle}
    >
      <View style={[styles.iconBox, { backgroundColor: rowColor + "22", borderRadius: 8 }]}>
        <Feather name={icon as any} size={17} color={rowColor} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.muted }}
          thumbColor="#fff"
        />
      ) : value !== undefined ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>;
}

function Divider({ marginLeft = 58 }: { marginLeft?: number }) {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border, marginLeft }]} />;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { downloadedChapters, removeDownload } = useDownloads();

  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoNext, setAutoNext] = useState(true);

  // Selection mode state for downloads
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  const enterSelectMode = (firstId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelecting(true);
    setSelected(firstId ? new Set([firstId]) : new Set());
  };

  const exitSelectMode = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === downloadedChapters.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(downloadedChapters.map((c) => c.chapterId)));
    }
  };

  const deleteSelected = () => {
    const count = selected.size;
    if (count === 0) return;
    const doDelete = () => {
      selected.forEach((id) => removeDownload(id));
      exitSelectMode();
    };
    if (Platform.OS === "web") { doDelete(); return; }
    Alert.alert("حذف المحدد", `هل تريد حذف ${count} ${count === 1 ? "فصل" : "فصول"}؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: doDelete },
    ]);
  };

  const deleteSingle = (chapterId: string, label: string) => {
    const doDelete = () => removeDownload(chapterId);
    if (Platform.OS === "web") { doDelete(); return; }
    Alert.alert("حذف الفصل", `هل تريد حذف "${label}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: doDelete },
    ]);
  };

  const deleteAll = () => {
    const doDelete = () => downloadedChapters.forEach((c) => removeDownload(c.chapterId));
    if (Platform.OS === "web") { doDelete(); return; }
    Alert.alert("حذف الكل", "هل تريد حذف جميع الفصول المحمّلة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: doDelete },
    ]);
  };

  const allSelected = downloadedChapters.length > 0 && selected.size === downloadedChapters.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>الضبط</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (selecting && selected.size > 0 ? 100 : 32) }}
      >
        {/* ── DOWNLOADS SECTION ── */}
        <SectionHeader title="الفصول المحمّلة" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>

          {/* Header row */}
          <View style={styles.downloadHeader}>
            <View style={styles.downloadHeaderLeft}>
              <View style={[styles.dlIconBox, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="download-cloud" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.dlTitle, { color: colors.foreground }]}>التنزيلات</Text>
                <Text style={[styles.dlSub, { color: colors.mutedForeground }]}>
                  {downloadedChapters.length === 0 ? "لا توجد فصول محمّلة" : `${downloadedChapters.length} فصل محمّل`}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            {selecting ? (
              <View style={styles.selectHeaderBtns}>
                <Pressable onPress={toggleSelectAll} hitSlop={6}>
                  <Text style={[styles.selectAction, { color: colors.primary }]}>
                    {allSelected ? "إلغاء الكل" : "تحديد الكل"}
                  </Text>
                </Pressable>
                <Pressable onPress={exitSelectMode} hitSlop={6}>
                  <Text style={[styles.selectAction, { color: colors.mutedForeground }]}>إلغاء</Text>
                </Pressable>
              </View>
            ) : downloadedChapters.length > 0 ? (
              <View style={styles.selectHeaderBtns}>
                <Pressable onPress={() => enterSelectMode()} hitSlop={6}>
                  <Text style={[styles.selectAction, { color: colors.primary }]}>تحديد</Text>
                </Pressable>
                <Pressable onPress={deleteAll} hitSlop={6}>
                  <Text style={[styles.selectAction, { color: "#EF4444" }]}>حذف الكل</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Chapter list */}
          {downloadedChapters.length > 0 && (
            <>
              <Divider marginLeft={0} />
              {downloadedChapters.map((item, idx) => {
                const isSelected = selected.has(item.chapterId);
                const label = `${item.mangaTitle} - ${item.chapterNum ? `فصل ${item.chapterNum}` : "فصل"}`;
                return (
                  <React.Fragment key={item.chapterId}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.dlItem,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + "18"
                            : pressed
                            ? colors.secondary
                            : "transparent",
                        },
                      ]}
                      onPress={() => {
                        if (selecting) {
                          toggleSelect(item.chapterId);
                        } else {
                          router.push(`/reader/${item.chapterId}`);
                        }
                      }}
                      onLongPress={() => {
                        if (!selecting) enterSelectMode(item.chapterId);
                      }}
                    >
                      {/* Checkbox */}
                      {selecting && (
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primary : "transparent",
                            },
                          ]}
                        >
                          {isSelected && <Feather name="check" size={11} color="#fff" />}
                        </View>
                      )}

                      {/* Cover */}
                      <View style={[styles.dlCoverWrap, { backgroundColor: colors.background, borderRadius: 6 }]}>
                        {item.coverUrl ? (
                          <Image
                            source={{ uri: item.coverUrl }}
                            style={[styles.dlCover, { borderRadius: 6 }]}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>

                      {/* Info */}
                      <View style={styles.dlInfo}>
                        <Text style={[styles.dlMangaTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {item.mangaTitle}
                        </Text>
                        <Text style={[styles.dlChapterLabel, { color: colors.mutedForeground }]}>
                          {item.chapterNum ? `فصل ${item.chapterNum}` : "فصل"}
                        </Text>
                        <Text style={[styles.dlPages, { color: colors.mutedForeground }]}>
                          {item.pageCount} صفحة
                        </Text>
                      </View>

                      {/* Right action */}
                      {selecting ? null : (
                        <View style={styles.dlActions}>
                          <View style={[styles.offlineBadge, { backgroundColor: colors.primary + "22" }]}>
                            <Feather name="wifi-off" size={10} color={colors.primary} />
                          </View>
                          <Pressable onPress={() => deleteSingle(item.chapterId, label)} hitSlop={8}>
                            <Feather name="trash-2" size={18} color="#EF4444" />
                          </Pressable>
                        </View>
                      )}
                    </Pressable>

                    {idx < downloadedChapters.length - 1 && (
                      <Divider marginLeft={selecting ? 60 : 16} />
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </View>

        {/* ── READING ── */}
        <SectionHeader title="القراءة" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow icon="database" label="توفير البيانات" toggle toggleValue={dataSaver} onToggle={setDataSaver} tint="#F59E0B" />
          <Divider />
          <SettingRow icon="skip-forward" label="الانتقال التلقائي للفصل التالي" toggle toggleValue={autoNext} onToggle={setAutoNext} tint="#10B981" />
        </View>

        <SectionHeader title="الإشعارات" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow icon="bell" label="إشعارات الفصول الجديدة" toggle toggleValue={notifications} onToggle={setNotifications} tint="#6366F1" />
        </View>

        <SectionHeader title="عن التطبيق" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow icon="info" label="الإصدار" value="1.0.0" tint={colors.mutedForeground} />
          <Divider />
          <SettingRow icon="globe" label="المصدر" value="MangaDex" tint="#06B6D4" />
        </View>
      </ScrollView>

      {/* ── BOTTOM DELETE BAR ── */}
      {selecting && selected.size > 0 && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Pressable style={[styles.deleteBtn, { backgroundColor: "#EF4444" }]} onPress={deleteSelected}>
            <Feather name="trash-2" size={16} color="#fff" />
            <Text style={styles.deleteBtnText}>
              حذف {selected.size} {selected.size === 1 ? "فصل" : "فصول"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700" },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  card: { marginHorizontal: 16, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconBox: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  rowValue: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  downloadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  downloadHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  dlIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dlTitle: { fontSize: 15, fontWeight: "600" },
  dlSub: { fontSize: 12, marginTop: 1 },
  selectHeaderBtns: { flexDirection: "row", gap: 12, alignItems: "center" },
  selectAction: { fontSize: 13, fontWeight: "600" },
  dlItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dlCoverWrap: { width: 44, height: 62, overflow: "hidden" },
  dlCover: { width: "100%", height: "100%" },
  dlInfo: { flex: 1, gap: 2 },
  dlMangaTitle: { fontSize: 13, fontWeight: "700" },
  dlChapterLabel: { fontSize: 12, fontWeight: "500" },
  dlPages: { fontSize: 11 },
  dlActions: { alignItems: "center", gap: 10 },
  offlineBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
