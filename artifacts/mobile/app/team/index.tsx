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
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTeam, type TeamManga } from "@/context/TeamContext";
import { useColors } from "@/hooks/useColors";
import { searchManga, getCoverUrl, getMangaTitle } from "@/lib/mangadex";

type Tab = "manga" | "members";

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { team, deleteTeam, addMember, removeMember, addManga, removeManga } = useTeam();

  const [tab, setTab] = useState<Tab>("manga");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamManga[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMangaSearch, setShowMangaSearch] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");

  if (!team) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-right" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>فريق الترجمة</Text>
          <View style={{ width: 22 }} />
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
        </View>
      </View>
    );
  }

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchManga(q);
      setSearchResults(
        results.slice(0, 10).map((m) => ({
          id: m.id,
          title: getMangaTitle(m),
          coverUrl: getCoverUrl(m, "256") || undefined,
        }))
      );
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleDeleteTeam = () => {
    if (Platform.OS === "web") { deleteTeam(); router.back(); return; }
    Alert.alert("حذف الفريق", "هل أنت متأكد من حذف الفريق؟ لا يمكن التراجع.", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => { deleteTeam(); router.back(); } },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>فريق الترجمة</Text>
        <Pressable onPress={() => router.push("/team/create")} hitSlop={8}>
          <Feather name="edit-2" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.statNum, { color: colors.primary }]}>{team.members.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>أعضاء</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Pressable style={styles.statItem} onPress={handleDeleteTeam}>
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text style={[styles.statLabel, { color: "#EF4444" }]}>حذف الفريق</Text>
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

        {/* Manga tab */}
        {tab === "manga" && (
          <View style={{ marginHorizontal: 16, marginTop: 12, gap: 8 }}>
            <Pressable
              style={[styles.addRowBtn, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.primary }]}
              onPress={() => setShowMangaSearch((v) => !v)}
            >
              <Feather name={showMangaSearch ? "x" : "plus"} size={16} color={colors.primary} />
              <Text style={[styles.addRowBtnText, { color: colors.primary }]}>
                {showMangaSearch ? "إغلاق البحث" : "إضافة مانجا"}
              </Text>
            </Pressable>

            {showMangaSearch && (
              <View style={[styles.searchBox, { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="ابحث عن مانجا..."
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
                {searching && <Feather name="loader" size={14} color={colors.mutedForeground} />}
              </View>
            )}

            {showMangaSearch && searchResults.map((m) => (
              <Pressable
                key={m.id}
                style={[styles.resultRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}
                onPress={() => { addManga(m); setShowMangaSearch(false); setSearchQuery(""); setSearchResults([]); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
              >
                {m.coverUrl ? (
                  <Image source={{ uri: m.coverUrl }} style={styles.resultCover} contentFit="cover" />
                ) : (
                  <View style={[styles.resultCoverPlaceholder, { backgroundColor: colors.secondary }]}>
                    <Feather name="book" size={14} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={[styles.resultTitle, { color: colors.foreground }]} numberOfLines={2}>{m.title}</Text>
                <Feather name="plus-circle" size={20} color={colors.primary} />
              </Pressable>
            ))}

            {team.manga.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>لا توجد مانجا بعد</Text>
              </View>
            ) : (
              team.manga.map((m) => (
                <View key={m.id} style={[styles.mangaRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  {m.coverUrl ? (
                    <Image source={{ uri: m.coverUrl }} style={styles.mangaCover} contentFit="cover" />
                  ) : (
                    <View style={[styles.mangaCoverPlaceholder, { backgroundColor: colors.secondary }]}>
                      <Feather name="book" size={18} color={colors.mutedForeground} />
                    </View>
                  )}
                  <Text style={[styles.mangaTitle, { color: colors.foreground }]} numberOfLines={2}>{m.title}</Text>
                  <Pressable onPress={() => removeManga(m.id)} hitSlop={8}>
                    <Feather name="trash-2" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Members tab */}
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
                <Text style={[styles.emptyTabText, { color: colors.mutedForeground }]}>لا يوجد أعضاء بعد</Text>
              </View>
            ) : (
              team.members.map((m) => (
                <View key={m.id} style={[styles.memberRow, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name="user" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.memberInfo}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
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
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  resultCover: { width: 40, height: 56, borderRadius: 6 },
  resultCoverPlaceholder: { width: 40, height: 56, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  resultTitle: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
  mangaRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  mangaCover: { width: 48, height: 68, borderRadius: 8 },
  mangaCoverPlaceholder: { width: 48, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  mangaTitle: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  emptyTab: { paddingVertical: 24, alignItems: "center" },
  emptyTabText: { fontSize: 14 },
  memberForm: { padding: 14, gap: 10 },
  memberInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  memberAddBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  memberAddBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberRole: { fontSize: 12, marginTop: 2 },
});
