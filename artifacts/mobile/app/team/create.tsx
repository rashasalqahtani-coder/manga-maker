import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

import { useTeam } from "@/context/TeamContext";
import { useColors } from "@/hooks/useColors";

const EMOJI_OPTIONS = ["🌸", "⚔️", "🔥", "🌙", "🐉", "🦊", "🌊", "⚡", "🎌", "📚", "🎭", "🌟"];

export default function CreateTeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { team, createTeam, updateTeam } = useTeam();

  const [name, setName]           = useState(team?.name ?? "");
  const [description, setDesc]    = useState(team?.description ?? "");
  const [emoji, setEmoji]         = useState(team?.emoji ?? "🌸");

  const isEdit = !!team;

  const handleSave = () => {
    if (!name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isEdit) {
      updateTeam({ name: name.trim(), description: description.trim(), emoji });
    } else {
      createTeam({ name: name.trim(), description: description.trim(), emoji });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace("/team/" as any);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEdit ? "تعديل الفريق" : "إنشاء فريق"}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!name.trim()}
          style={{ opacity: name.trim() ? 1 : 0.4 }}
        >
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "700" }}>حفظ</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* Emoji picker */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>شعار الفريق</Text>
        <View style={styles.emojiRow}>
          {EMOJI_OPTIONS.map((e) => (
            <Pressable
              key={e}
              style={[
                styles.emojiOption,
                {
                  backgroundColor: emoji === e ? colors.primary + "22" : colors.card,
                  borderWidth: emoji === e ? 2 : 0,
                  borderColor: emoji === e ? colors.primary : "transparent",
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => { Haptics.selectionAsync(); setEmoji(e); }}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        {/* Preview card */}
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <Text style={styles.previewEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewName, { color: name ? colors.foreground : colors.mutedForeground }]}>
              {name || "اسم فريقك"}
            </Text>
            {description ? (
              <Text style={[styles.previewDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>اسم الفريق *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
          value={name}
          onChangeText={setName}
          placeholder="مثال: فريق الوردة"
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          maxLength={40}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>وصف الفريق</Text>
        <TextInput
          style={[styles.inputMulti, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
          value={description}
          onChangeText={setDesc}
          placeholder="أخبر الجميع عن فريقك..."
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          multiline
          numberOfLines={4}
          maxLength={200}
        />

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: name.trim() ? 1 : 0.5 }]}
          onPress={handleSave}
          disabled={!name.trim()}
        >
          <Feather name={isEdit ? "save" : "users"} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{isEdit ? "حفظ التعديلات" : "إنشاء الفريق"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 16, gap: 10 },
  label: { fontSize: 12, fontWeight: "600", textAlign: "right", marginTop: 6 },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiOption: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 26 },
  previewCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginTop: 4 },
  previewEmoji: { fontSize: 32 },
  previewName: { fontSize: 17, fontWeight: "700" },
  previewDesc: { fontSize: 12, marginTop: 3 },
  input: { height: 50, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 15 },
  inputMulti: { minHeight: 100, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlignVertical: "top" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
