import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
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

import {
  ACCENT_PRESETS,
  BG_PRESETS,
  RADIUS_PRESETS,
  useTheme,
} from "@/context/ThemeContext";
import { useReaderSettings } from "@/context/ReaderSettingsContext";
import { SOURCES, useSource } from "@/context/SourceContext";
import { useTeam } from "@/context/TeamContext";
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
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { accentId, bgId, radiusId, setAccent, setBg, setRadius } = useTheme();

  const { team } = useTeam();
  const { source, setSource } = useSource();
  const {
    direction, mode, highQuality, keepScreenOn,
    setDirection, setMode, setHighQuality, setKeepScreenOn,
  } = useReaderSettings();

  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [appLock, setAppLock] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);

  // Selection mode state for downloads
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  const handleSignOut = () => {
    if (Platform.OS === "web") { signOut(); return; }
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من حسابك؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => signOut() },
    ]);
  };

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
        {/* ── SOURCES SECTION ── */}
        <SectionHeader title="مصادر المانجا" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          {SOURCES.map((src, i) => {
            const selected = src.id === source;
            return (
              <React.Fragment key={src.id}>
                {i > 0 && <Divider marginLeft={0} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: pressed
                        ? colors.secondary
                        : selected
                        ? colors.primary + "10"
                        : "transparent",
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSource(src.id);
                  }}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.primary + "22", borderRadius: 8 }]}>
                    <Text style={{ fontSize: 17 }}>{src.flag}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: selected ? colors.primary : colors.foreground, fontWeight: selected ? "700" : "500" }]}>
                      {src.nameAr}
                    </Text>
                    <Text style={[{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }]} numberOfLines={1}>
                      {src.description}
                    </Text>
                  </View>
                  {selected ? (
                    <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primary }]}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>مفعّل</Text>
                    </View>
                  ) : (
                    <View style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border }]} />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* ── ACCOUNT SECTION ── */}
        <SectionHeader title="الحساب" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          {isSignedIn && user ? (
            <>
              {/* User info row */}
              <View style={styles.userRow}>
                <View style={[styles.userAvatar, { backgroundColor: colors.primary + "22" }]}>
                  {user.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <Feather name="user" size={22} color={colors.primary} />
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                    {user.fullName || user.username || "مستخدم"}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {user.primaryEmailAddress?.emailAddress ?? ""}
                  </Text>
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: "#10B98122" }]}>
                  <Feather name="check-circle" size={14} color="#10B981" />
                </View>
              </View>
              <Divider marginLeft={0} />
              {/* Sign out */}
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? colors.secondary : "transparent" },
                ]}
                onPress={handleSignOut}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EF444422", borderRadius: 8 }]}>
                  <Feather name="log-out" size={17} color="#EF4444" />
                </View>
                <Text style={[styles.rowLabel, { color: "#EF4444" }]}>تسجيل الخروج</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Not signed in */}
              <Pressable
                style={({ pressed }) => [
                  styles.authBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => router.push("/(auth)/sign-in")}
              >
                <Feather name="log-in" size={17} color="#fff" />
                <Text style={styles.authBtnText}>تسجيل الدخول</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.authBtnSecondary,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.primary,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                onPress={() => router.push("/(auth)/sign-up")}
              >
                <Feather name="user-plus" size={17} color={colors.primary} />
                <Text style={[styles.authBtnSecondaryText, { color: colors.primary }]}>إنشاء حساب جديد</Text>
              </Pressable>
            </>
          )}
        </View>

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

        {/* ── APPEARANCE ── */}
        <SectionHeader title="المظهر" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>

          {/* Accent color row */}
          <View style={styles.themeBlock}>
            <Text style={[styles.themeLabel, { color: colors.mutedForeground }]}>لون التمييز</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
              {ACCENT_PRESETS.map((p) => {
                const active = p.id === accentId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { Haptics.selectionAsync(); setAccent(p.id); }}
                    style={styles.swatchWrap}
                  >
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: p.color },
                        active && styles.swatchActive,
                      ]}
                    >
                      {active && <Feather name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.swatchName, { color: active ? p.color : colors.mutedForeground }]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Background preset row */}
          <View style={styles.themeBlock}>
            <Text style={[styles.themeLabel, { color: colors.mutedForeground }]}>الخلفية</Text>
            <View style={styles.bgRow}>
              {BG_PRESETS.map((p) => {
                const active = p.id === bgId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { Haptics.selectionAsync(); setBg(p.id); }}
                    style={[
                      styles.bgChip,
                      {
                        backgroundColor: p.card,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.bgDot, { backgroundColor: p.background }]} />
                    <Text
                      style={[
                        styles.bgChipLabel,
                        { color: active ? colors.primary : colors.foreground },
                      ]}
                    >
                      {p.label}
                    </Text>
                    {active && (
                      <View style={[styles.bgCheckBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Border radius row */}
          <View style={styles.themeBlock}>
            <Text style={[styles.themeLabel, { color: colors.mutedForeground }]}>الزوايا</Text>
            <View style={styles.radiusRow}>
              {RADIUS_PRESETS.map((p) => {
                const active = p.id === radiusId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { Haptics.selectionAsync(); setRadius(p.id); }}
                    style={[
                      styles.radiusChip,
                      {
                        backgroundColor: active ? colors.primary : colors.secondary,
                        borderRadius: p.value,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusLabel,
                        { color: active ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── TRANSLATION TEAM ── */}
        <SectionHeader title="فريق الترجمة" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          {team ? (
            <>
              <Pressable
                style={styles.teamPreviewRow}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => router.push("/team/" as any)}
              >
                <View style={[styles.teamEmojiBox, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={styles.teamEmojiBoxText}>{team.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.teamPreviewName, { color: colors.foreground }]}>{team.name}</Text>
                  <Text style={[styles.teamPreviewSub, { color: colors.mutedForeground }]}>
                    {team.manga.length} مانجا · {team.members.length} أعضاء
                  </Text>
                </View>
                <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              </Pressable>
            </>
          ) : (
            <SettingRow
              icon="users"
              label="إنشاء فريق ترجمة"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push("/team/create" as any)}
              tint={colors.primary}
            />
          )}
        </View>

        {/* ── READER VIEW ── */}
        <SectionHeader title="رؤية القارئ" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          {/* Reading direction */}
          <View style={styles.themeBlock}>
            <Text style={[styles.themeLabel, { color: colors.mutedForeground }]}>اتجاه القراءة</Text>
            <View style={styles.radiusRow}>
              {([
                { id: "rtl", label: "← يمين لشمال" },
                { id: "ltr", label: "يسار لـيمين →" },
                { id: "vertical", label: "↓ رأسي" },
              ] as { id: "rtl" | "ltr" | "vertical"; label: string }[]).map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.radiusChip,
                    {
                      backgroundColor: direction === opt.id ? colors.primary : colors.secondary,
                      borderRadius: colors.radius,
                      flex: opt.id === "vertical" ? 0.8 : 1.1,
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setDirection(opt.id); }}
                >
                  <Text style={[styles.radiusLabel, { color: direction === opt.id ? "#fff" : colors.mutedForeground, fontSize: 11 }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Divider marginLeft={0} />
          {/* Reading mode */}
          <View style={styles.themeBlock}>
            <Text style={[styles.themeLabel, { color: colors.mutedForeground }]}>وضع العرض</Text>
            <View style={styles.radiusRow}>
              {([
                { id: "pages", label: "صفحة بصفحة", icon: "book" },
                { id: "scroll", label: "تمرير متواصل", icon: "align-justify" },
              ] as { id: "pages" | "scroll"; label: string; icon: string }[]).map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.radiusChip,
                    { backgroundColor: mode === opt.id ? colors.primary : colors.secondary, borderRadius: colors.radius },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setMode(opt.id); }}
                >
                  <Feather name={opt.icon as any} size={13} color={mode === opt.id ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.radiusLabel, { color: mode === opt.id ? "#fff" : colors.mutedForeground, fontSize: 11 }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Divider marginLeft={0} />
          <SettingRow icon="database" label="توفير البيانات" toggle toggleValue={dataSaver} onToggle={setDataSaver} tint="#F59E0B" />
          <Divider />
          <SettingRow icon="zap" label="جودة عالية للصور" toggle toggleValue={highQuality} onToggle={setHighQuality} tint="#8B5CF6" />
          <Divider />
          <SettingRow icon="sun" label="إبقاء الشاشة مضاءة" toggle toggleValue={keepScreenOn} onToggle={setKeepScreenOn} tint="#F59E0B" />
          <Divider />
          <SettingRow icon="skip-forward" label="الانتقال التلقائي للفصل التالي" toggle toggleValue={autoNext} onToggle={setAutoNext} tint="#10B981" />
        </View>

        {/* ── SECURITY ── */}
        <SectionHeader title="الأمان" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow
            icon="lock"
            label="قفل التطبيق"
            toggle
            toggleValue={appLock}
            onToggle={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAppLock(v); }}
            tint="#EF4444"
          />
          <Divider />
          <SettingRow
            icon="eye-off"
            label="وضع الخصوصية"
            toggle
            toggleValue={privateMode}
            onToggle={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPrivateMode(v); }}
            tint="#6366F1"
          />
          {privateMode && (
            <>
              <Divider />
              <View style={[styles.privacyBanner, { backgroundColor: "#6366F120" }]}>
                <Feather name="shield" size={14} color="#6366F1" />
                <Text style={[styles.privacyBannerText, { color: "#6366F1" }]}>
                  لن يظهر سجل القراءة في الشاشة الرئيسية
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="الإشعارات" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow icon="bell" label="إشعارات الفصول الجديدة" toggle toggleValue={notifications} onToggle={setNotifications} tint="#6366F1" />
        </View>

        {/* ── ABOUT / SUPPORT ── */}
        <SectionHeader title="المزيد" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow
            icon="compass"
            label="الاقتراحات"
            value="اقترح مانجا مشابهة"
            tint="#8B5CF6"
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/suggestions" as any);
            }}
          />
          <Divider />
          <SettingRow
            icon="share-2"
            label="مشاركة التطبيق"
            tint="#10B981"
            onPress={async () => {
              Haptics.selectionAsync();
              const { Share } = await import("react-native");
              Share.share({
                message: "جرّب تطبيق مانجا! أفضل تطبيق عربي لقراءة المانجا 📚",
                title: "مانجا - تطبيق القراءة",
              }).catch(() => {});
            }}
          />
          <Divider />
          <SettingRow
            icon="help-circle"
            label="مساعدة ودعم"
            tint="#3B82F6"
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                "مساعدة ودعم",
                "• مصادر المحتوى العربية متاحة داخل التطبيق\n• أرسل ملاحظاتك عبر متجر التطبيقات\n• للإبلاغ عن مشكلة: تحقق من اتصالك بالإنترنت أولاً",
                [{ text: "حسناً" }]
              );
            }}
          />
          <Divider />
          <SettingRow
            icon="info"
            label="حول التطبيق"
            tint={colors.mutedForeground}
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert(
                "حول التطبيق",
                "مانجا - قارئ المانجا العربي\n\nالإصدار: 1.0.0\n\nتطبيق مجاني لقراءة المانجا باللغة العربية",
                [{ text: "إغلاق" }]
              );
            }}
          />
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
  userRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: "700" },
  userEmail: { fontSize: 12 },
  verifiedBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  authBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, margin: 14, paddingVertical: 14, borderRadius: 14,
  },
  authBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  authBtnSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginHorizontal: 14, marginBottom: 14, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5,
  },
  authBtnSecondaryText: { fontSize: 15, fontWeight: "700" },

  // ── Theme picker styles ──
  themeBlock: { padding: 14, gap: 12 },
  themeLabel: { fontSize: 12, fontWeight: "600", textAlign: "right" },
  swatchRow: { flexDirection: "row", gap: 16, paddingVertical: 4 },
  swatchWrap: { alignItems: "center", gap: 6 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  swatchName: { fontSize: 10, fontWeight: "600" },
  bgRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bgChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: "45%",
    flex: 1,
    position: "relative",
  },
  bgDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: "#ffffff20" },
  bgChipLabel: { fontSize: 13, fontWeight: "600", flex: 1 },
  bgCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusRow: { flexDirection: "row", gap: 10 },
  radiusChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusLabel: { fontSize: 13, fontWeight: "600" },
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

  // ── Team preview ──
  teamPreviewRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  teamEmojiBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  teamEmojiBoxText: { fontSize: 22 },
  teamPreviewName: { fontSize: 15, fontWeight: "700" },
  teamPreviewSub: { fontSize: 12, marginTop: 2 },

  // ── Privacy banner ──
  privacyBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  privacyBannerText: { fontSize: 12, fontWeight: "500", flex: 1 },
});
