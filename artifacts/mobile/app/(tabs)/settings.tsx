import { Feather } from "@expo/vector-icons";
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
  destructive?: boolean;
}

function SettingRow({
  icon,
  label,
  value,
  toggle,
  toggleValue,
  onToggle,
  onPress,
  tint,
  destructive,
}: SettingRowProps) {
  const colors = useColors();
  const rowColor = destructive ? "#EF4444" : tint ?? colors.primary;
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
      <Text style={[styles.rowLabel, { color: destructive ? "#EF4444" : colors.foreground }]}>
        {label}
      </Text>
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
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { downloadedChapters, removeDownload } = useDownloads();

  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoNext, setAutoNext] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  const handleDeleteChapter = (chapterId: string, title: string) => {
    if (Platform.OS === "web") {
      removeDownload(chapterId);
      return;
    }
    Alert.alert("حذف الفصل", `هل تريد حذف "${title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => removeDownload(chapterId),
      },
    ]);
  };

  const handleDeleteAll = () => {
    if (Platform.OS === "web") {
      downloadedChapters.forEach((ch) => removeDownload(ch.chapterId));
      return;
    }
    Alert.alert("حذف الكل", "هل تريد حذف جميع الفصول المحمّلة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف الكل",
        style: "destructive",
        onPress: () => downloadedChapters.forEach((ch) => removeDownload(ch.chapterId)),
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>الضبط</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── DOWNLOADS SECTION ── */}
        <SectionHeader title="الفصول المحمّلة" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <View style={styles.downloadHeader}>
            <View style={styles.downloadHeaderLeft}>
              <View style={[styles.dlIconBox, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="download-cloud" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.dlTitle, { color: colors.foreground }]}>
                  التنزيلات
                </Text>
                <Text style={[styles.dlSub, { color: colors.mutedForeground }]}>
                  {downloadedChapters.length === 0
                    ? "لا توجد فصول محمّلة"
                    : `${downloadedChapters.length} فصل محمّل`}
                </Text>
              </View>
            </View>
            {downloadedChapters.length > 0 && (
              <Pressable
                onPress={handleDeleteAll}
                style={[styles.deleteAllBtn, { backgroundColor: "#EF444422", borderRadius: 8 }]}
                hitSlop={6}
              >
                <Text style={styles.deleteAllText}>حذف الكل</Text>
              </Pressable>
            )}
          </View>

          {downloadedChapters.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 0 }]} />
              {downloadedChapters.map((item, idx) => (
                <React.Fragment key={item.chapterId}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.dlItem,
                      { backgroundColor: pressed ? colors.secondary : "transparent" },
                    ]}
                    onPress={() => router.push(`/reader/${item.chapterId}`)}
                  >
                    <View
                      style={[
                        styles.dlCoverWrap,
                        { backgroundColor: colors.background, borderRadius: 6 },
                      ]}
                    >
                      {item.coverUrl ? (
                        <Image
                          source={{ uri: item.coverUrl }}
                          style={[styles.dlCover, { borderRadius: 6 }]}
                          contentFit="cover"
                        />
                      ) : null}
                    </View>
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
                    <View style={styles.dlActions}>
                      <View style={[styles.offlineBadge, { backgroundColor: colors.primary + "22" }]}>
                        <Feather name="wifi-off" size={10} color={colors.primary} />
                      </View>
                      <Pressable
                        onPress={() =>
                          handleDeleteChapter(
                            item.chapterId,
                            `${item.mangaTitle} - ${item.chapterNum ? `فصل ${item.chapterNum}` : "فصل"}`
                          )
                        }
                        hitSlop={8}
                      >
                        <Feather name="trash-2" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </Pressable>
                  {idx < downloadedChapters.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 16 }]} />
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </View>

        {/* ── READING SECTION ── */}
        <SectionHeader title="القراءة" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow
            icon="database"
            label="توفير البيانات"
            toggle
            toggleValue={dataSaver}
            onToggle={setDataSaver}
            tint="#F59E0B"
          />
          <Divider />
          <SettingRow
            icon="skip-forward"
            label="الانتقال التلقائي للفصل التالي"
            toggle
            toggleValue={autoNext}
            onToggle={setAutoNext}
            tint="#10B981"
          />
        </View>

        <SectionHeader title="الإشعارات" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow
            icon="bell"
            label="إشعارات الفصول الجديدة"
            toggle
            toggleValue={notifications}
            onToggle={setNotifications}
            tint="#6366F1"
          />
        </View>

        <SectionHeader title="عن التطبيق" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow icon="info" label="الإصدار" value="1.0.0" tint={colors.mutedForeground} />
          <Divider />
          <SettingRow icon="globe" label="المصدر" value="MangaDex" tint="#06B6D4" />
        </View>
      </ScrollView>
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
  dlIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dlTitle: { fontSize: 15, fontWeight: "600" },
  dlSub: { fontSize: 12, marginTop: 1 },
  deleteAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  deleteAllText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  dlItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  dlCoverWrap: { width: 44, height: 62, overflow: "hidden" },
  dlCover: { width: "100%", height: "100%" },
  dlInfo: { flex: 1, gap: 2 },
  dlMangaTitle: { fontSize: 13, fontWeight: "700" },
  dlChapterLabel: { fontSize: 12, fontWeight: "500" },
  dlPages: { fontSize: 11 },
  dlActions: { alignItems: "center", gap: 10 },
  offlineBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
