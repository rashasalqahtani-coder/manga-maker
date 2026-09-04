import { Feather } from "@expo/vector-icons";
import { useAuth, useSignUp } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [flowError, setFlowError] = useState("");
  const finalizingRef = useRef(false);

  const isLoading = fetchStatus === "fetching";
  const needsVerify =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const handleSignUp = async () => {
    setFlowError("");
    const { error } = await signUp.password({
      emailAddress: email.trim(),
      password,
    });
    if (error) return;
    const { error: verificationError } =
      await signUp.verifications.sendEmailCode();
    if (verificationError) setFlowError(verificationError.message);
  };

  const handleVerify = async () => {
    setFlowError("");
    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (error) return;
  };

  useEffect(() => {
    if (signUp.status === "complete" && !isSignedIn && !finalizingRef.current) {
      finalizingRef.current = true;
      void signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (url.startsWith("http") && Platform.OS === "web") {
            window.location.href = url;
          } else {
            router.replace(url as Href);
          }
        },
      }).then(({ error }) => {
        if (error) {
          finalizingRef.current = false;
          setFlowError(error.message);
        }
      });
    }
  }, [isSignedIn, signUp.status]);

  if (signUp.status === "complete" || isSignedIn) return null;

  // Verification step
  if (needsVerify) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={[styles.iconCircle, { backgroundColor: "#10B98120" }]}>
            <Feather name="mail" size={36} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>تحقق من بريدك</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            أرسلنا رمز تحقق إلى{"\n"}
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>{email}</Text>
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={code}
            onChangeText={setCode}
            placeholder="رمز التحقق"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            textAlign="center"
            maxLength={6}
          />
          {errors?.fields?.code && (
            <Text style={styles.errorText}>{errors.fields.code.message}</Text>
          )}
          {!!flowError && <Text style={styles.errorText}>{flowError}</Text>}

          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary, opacity: isLoading || code.length !== 6 ? 0.6 : 1 }]}
            onPress={handleVerify}
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>تأكيد</Text>}
          </Pressable>

          <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.primary }]}>أعد إرسال الرمز</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="user-plus" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>إنشاء حساب</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          سجّل بريدك الإلكتروني لحفظ تقدمك ومكتبتك
        </Text>

        {/* Email */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>البريد الإلكتروني</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          value={email}
          onChangeText={setEmail}
          placeholder="example@email.com"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign="right"
        />
        {errors?.fields?.emailAddress && (
          <Text style={styles.errorText}>{errors.fields.emailAddress.message}</Text>
        )}

        {/* Password */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>كلمة المرور</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
          </Pressable>
          <TextInput
            style={[styles.inputInner, { color: colors.foreground }]}
            value={password}
            onChangeText={setPassword}
            placeholder="8 أحرف على الأقل"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            textAlign="right"
          />
        </View>
        {errors?.fields?.password && (
          <Text style={styles.errorText}>{errors.fields.password.message}</Text>
        )}
        {!!flowError && <Text style={styles.errorText}>{flowError}</Text>}

        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary, opacity: isLoading || !email || !password ? 0.6 : 1 }]}
          onPress={handleSignUp}
          disabled={isLoading || !email || !password}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>إنشاء الحساب</Text>
          )}
        </Pressable>

        {/* Required for Clerk bot protection */}
        <View nativeID="clerk-captcha" />

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>لديك حساب بالفعل؟ </Text>
          <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
            <Text style={[styles.linkText, { color: colors.primary }]}>تسجيل الدخول</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", textAlign: "right", marginBottom: -4 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inputRow: {
    height: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputInner: { flex: 1, fontSize: 15 },
  errorText: { color: "#EF4444", fontSize: 12, textAlign: "right" },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8 },
  switchText: { fontSize: 14 },
  linkBtn: { alignItems: "center" },
  linkText: { fontSize: 14, fontWeight: "600" },
});
