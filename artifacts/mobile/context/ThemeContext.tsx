"use no memo";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// ──────────────────────────────────────────────
// Accent color presets
// ──────────────────────────────────────────────
export interface AccentPreset {
  id: string;
  label: string;
  color: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "red",    label: "أحمر",    color: "#E84040" },
  { id: "orange", label: "برتقالي", color: "#F97316" },
  { id: "yellow", label: "ذهبي",    color: "#EAB308" },
  { id: "green",  label: "أخضر",    color: "#22C55E" },
  { id: "teal",   label: "فيروزي",  color: "#14B8A6" },
  { id: "blue",   label: "أزرق",    color: "#3B82F6" },
  { id: "purple", label: "بنفسجي",  color: "#8B5CF6" },
  { id: "pink",   label: "وردي",    color: "#EC4899" },
];

// ──────────────────────────────────────────────
// Background presets
// ──────────────────────────────────────────────
export interface BgPreset {
  id: string;
  label: string;
  background: string;
  card: string;
  secondary: string;
  border: string;
}

export const BG_PRESETS: BgPreset[] = [
  { id: "dark",     label: "داكن",   background: "#0F0F0F", card: "#1C1C1E", secondary: "#2C2C2E", border: "#2C2C2E" },
  { id: "amoled",   label: "أسود",   background: "#000000", card: "#0D0D0D", secondary: "#1A1A1A", border: "#1A1A1A" },
  { id: "charcoal", label: "فحمي",   background: "#141414", card: "#1F1F1F", secondary: "#2A2A2A", border: "#2A2A2A" },
  { id: "gray",     label: "رمادي",  background: "#1A1A1A", card: "#252525", secondary: "#303030", border: "#303030" },
  { id: "white",    label: "أبيض",   background: "#FFFFFF", card: "#F7F7F8", secondary: "#ECECEF", border: "#D1D1D6" },
];

// ──────────────────────────────────────────────
// Border radius presets
// ──────────────────────────────────────────────
export interface RadiusPreset {
  id: string;
  label: string;
  value: number;
}

export const RADIUS_PRESETS: RadiusPreset[] = [
  { id: "sharp",  label: "حاد",    value: 4  },
  { id: "medium", label: "معتدل",  value: 10 },
  { id: "round",  label: "مستدير", value: 18 },
];

// ──────────────────────────────────────────────
// Persistence helpers (platform-safe)
// ──────────────────────────────────────────────
const STORAGE_KEY = "theme_v1";

function loadTheme(): Record<string, string> {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Record<string, string>;
    }
  } catch { /* ignore */ }
  return {};
}

function saveTheme(data: Record<string, string>) {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    }
    // On native, use AsyncStorage asynchronously without blocking render
    void import("@react-native-async-storage/async-storage").then((m) => {
      m.default.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    });
  } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────
interface ThemeContextValue {
  accentId: string;
  bgId: string;
  radiusId: string;
  accent: AccentPreset;
  bg: BgPreset;
  radiusPreset: RadiusPreset;
  setAccent: (id: string) => void;
  setBg: (id: string) => void;
  setRadius: (id: string) => void;
}

function getDefaults(): ThemeContextValue {
  const saved = loadTheme();
  const accentId = saved.accentId ?? "red";
  const bgId     = saved.bgId     ?? "dark";
  const radiusId = saved.radiusId ?? "medium";
  return {
    accentId, bgId, radiusId,
    accent:       ACCENT_PRESETS.find((p) => p.id === accentId) ?? ACCENT_PRESETS[0],
    bg:           BG_PRESETS.find((p) => p.id === bgId) ?? BG_PRESETS[0],
    radiusPreset: RADIUS_PRESETS.find((p) => p.id === radiusId) ?? RADIUS_PRESETS[1],
    setAccent: () => {},
    setBg: () => {},
    setRadius: () => {},
  };
}

const ThemeContext = createContext<ThemeContextValue>(getDefaults());

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentId, setAccentId] = useState(() => loadTheme().accentId ?? "red");
  const [bgId,     setBgId]     = useState(() => loadTheme().bgId     ?? "dark");
  const [radiusId, setRadiusId] = useState(() => loadTheme().radiusId ?? "medium");

  // On native, load persisted values after mount
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (Platform.OS !== "web") {
      import("@react-native-async-storage/async-storage").then((m) => {
        m.default.getItem(STORAGE_KEY).then((raw) => {
          if (!raw) return;
          const saved = JSON.parse(raw) as Record<string, string>;
          if (saved.accentId) setAccentId(saved.accentId);
          if (saved.bgId)     setBgId(saved.bgId);
          if (saved.radiusId) setRadiusId(saved.radiusId);
        }).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  function setAccent(id: string) {
    setAccentId(id);
    saveTheme({ accentId: id, bgId, radiusId });
  }
  function setBg(id: string) {
    setBgId(id);
    saveTheme({ accentId, bgId: id, radiusId });
  }
  function setRadius(id: string) {
    setRadiusId(id);
    saveTheme({ accentId, bgId, radiusId: id });
  }

  const value: ThemeContextValue = {
    accentId,
    bgId,
    radiusId,
    accent:       ACCENT_PRESETS.find((p) => p.id === accentId) ?? ACCENT_PRESETS[0],
    bg:           BG_PRESETS.find((p) => p.id === bgId)         ?? BG_PRESETS[0],
    radiusPreset: RADIUS_PRESETS.find((p) => p.id === radiusId) ?? RADIUS_PRESETS[1],
    setAccent,
    setBg,
    setRadius,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
