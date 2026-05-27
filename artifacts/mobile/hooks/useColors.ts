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
    cardForeground:       "#FFFFFF",
    secondary:            bg.secondary,
    secondaryForeground:  "#EBEBF5",
    muted:                bg.secondary,
    border:               bg.border,
    input:                bg.border,

    // Text
    text:             "#FFFFFF",
    foreground:       "#FFFFFF",
    mutedForeground:  "#8E8E93",

    // Destructive
    destructive:            staticColors.dark.destructive,
    destructiveForeground:  "#FFFFFF",

    // Border radius
    radius: radiusPreset.value,
  };
}
