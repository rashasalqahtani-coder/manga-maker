import { useColorScheme } from "react-native";

import staticColors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

/**
 * Returns the full design-token palette.
 * Merges the static color structure with the user's chosen theme (accent, bg, radius).
 */
export function useColors() {
  useColorScheme(); // subscribe to system scheme changes (keeps hook count stable)
  const { accent, bg, radiusPreset } = useTheme();
  const isLight = bg.id === "white";

  return {
    // Accent / primary
    tint:              accent.color,
    primary:           accent.color,
    primaryForeground: "#FFFFFF",
    accent:            accent.color,
    accentForeground:  "#FFFFFF",

    // Background family (from chosen bg preset)
    background:           bg.background,
    card:                 bg.card,
    cardForeground:       isLight ? "#111111" : "#FFFFFF",
    secondary:            bg.secondary,
    secondaryForeground:  isLight ? "#2C2C2E" : "#EBEBF5",
    muted:                bg.secondary,
    border:               bg.border,
    input:                bg.border,

    // Text
    text:             isLight ? "#111111" : "#FFFFFF",
    foreground:       isLight ? "#111111" : "#FFFFFF",
    mutedForeground:  isLight ? "#636366" : "#8E8E93",

    // Destructive
    destructive:            staticColors.dark.destructive,
    destructiveForeground:  "#FFFFFF",

    // Border radius
    radius: radiusPreset.value,
  };
}
