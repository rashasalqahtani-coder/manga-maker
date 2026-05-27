"use no memo";
import { Feather } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  getComments,
  postComment,
  deleteComment,
  type Comment,
} from "@/lib/comments";

interface CommentsSheetProps {
  visible: boolean;
  onClose: () => void;
  entityType: "chapter" | "team";
  entityId: string;
  title?: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export function CommentsSheet({ visible, onClose, entityType, entityId, title }: CommentsSheetProps) {
  "use no memo";
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const data = await getComments(entityType, entityId);
      setComments(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handlePost = async () => {
    if (!text.trim()) return;
    if (!isSignedIn) {
      Alert.alert("تسجيل الدخول مطلوب", "يجب تسجيل الدخول لإضافة تعليق.");
      return;
    }
    setPosting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const userName =
        user?.fullName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "مجهول";
      const userAvatar = user?.imageUrl ?? undefined;
      const created = await postComment(
        entityType,
        entityId,
        { content: text.trim(), userName, userAvatar },
        token,
      );
      setComments((prev) => [created, ...prev]);
      setText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("خطأ", "تعذّر نشر التعليق، حاول مجدداً.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (id: string) => {
    const doDelete = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await deleteComment(id, token);
        setComments((prev) => prev.filter((c) => c.id !== id));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        Alert.alert("خطأ", "تعذّر حذف التعليق.");
      }
    };
    if (Platform.OS === "web") {
      doDelete();
    } else {
      Alert.alert("حذف التعليق", "هل تريد حذف هذا التعليق؟", [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const bottomPad = insets.bottom + 8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.sheet, { backgroundColor: colors.background }]}
      >
        {/* Handle + header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {title ?? "التعليقات"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Comments list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.center}>
            <Feather name="message-circle" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              لا توجد تعليقات بعد. كن أول من يعلّق!
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
            renderItem={({ item }) => {
              const isOwn = item.userId === user?.id;
              return (
                <View style={styles.commentRow}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {item.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  {/* Body */}
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={[styles.commentUser, { color: colors.foreground }]}>
                        {item.userName}
                      </Text>
                      <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                        {timeAgo(item.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.commentContent, { color: colors.foreground }]}>
                      {item.content}
                    </Text>
                  </View>
                  {/* Delete own */}
                  {isOwn && (
                    <Pressable
                      onPress={() => handleDelete(item.id)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                    >
                      <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: bottomPad,
            },
          ]}
        >
          {isSignedIn ? (
            <>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="أضف تعليقاً..."
                placeholderTextColor={colors.mutedForeground}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
                textAlign="right"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor: text.trim() ? colors.primary : colors.secondary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handlePost}
                disabled={posting || !text.trim()}
              >
                {posting ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : (
                  <Feather name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />
                )}
              </Pressable>
            </>
          ) : (
            <Text style={[styles.loginHint, { color: colors.mutedForeground }]}>
              سجّل الدخول لإضافة تعليق
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    maxHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  separator: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: "700" },
  commentBody: { flex: 1, gap: 3 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentUser: { fontSize: 13, fontWeight: "700" },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { padding: 4, alignSelf: "flex-start", marginTop: 2 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 100,
    textAlignVertical: "top",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  loginHint: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 12,
  },
});
