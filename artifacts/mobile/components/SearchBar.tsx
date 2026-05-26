import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Search manga...",
}: SearchBarProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Feather name="search" size={18} color={colors.mutedForeground} />
      <TextInput
        style={[styles.input, { color: colors.foreground }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode={Platform.OS === "ios" ? "while-editing" : "never"}
      />
      {value.length > 0 && Platform.OS !== "ios" && (
        <Pressable onPress={onClear} hitSlop={8}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});
