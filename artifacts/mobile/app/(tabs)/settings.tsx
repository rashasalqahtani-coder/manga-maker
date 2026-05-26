import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  primary?: string;
  tint?: string;
}

function SettingRow({
  icon,
  label,
  value,
  toggle,
  toggleValue,
  onToggle,
  onPress,
  primary,
  tint,
}: SettingRowProps) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed && onPress ? colors.secondary : "transparent" },
      ]}
      onPress={onPress}
      disabled={!onPress && !toggle}
    >
      <View style={[styles.iconBox, { backgroundColor: (tint ?? colors.primary) + "22", borderRadius: 8 }]}>
        <Feather name={icon as any} size={17} color={tint ?? primary ?? colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.muted }}
          thumbColor="#fff"
        />
      ) : value ? (
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

  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoNext, setAutoNext] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>الضبط</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
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

        <SectionHeader title="التخزين" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow
            icon="trash-2"
            label="مسح التاريخ"
            onPress={() => {}}
            tint="#EF4444"
          />
          <Divider />
          <SettingRow
            icon="hard-drive"
            label="الذاكرة المستخدمة"
            value="—"
            tint="#8B5CF6"
          />
        </View>

        <SectionHeader title="عن التطبيق" />
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
          <SettingRow
            icon="info"
            label="الإصدار"
            value="1.0.0"
            tint={colors.mutedForeground}
          />
          <Divider />
          <SettingRow
            icon="globe"
            label="المصدر"
            value="MangaDex"
            tint="#06B6D4"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
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
  card: {
    marginHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});
