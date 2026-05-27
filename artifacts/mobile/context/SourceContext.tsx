"use no memo";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export type SourceId = "starz" | "linkmanga" | "dilar" | "olympus";

export interface SourceInfo {
  id: SourceId;
  nameAr: string;
  nameEn: string;
  url: string;
  description: string;
  haSearch: boolean;
  hasChapterList: boolean;
  flag: string;
}

export const SOURCES: SourceInfo[] = [
  {
    id: "starz",
    nameAr: "مانجا ستارز",
    nameEn: "Manga Starz",
    url: "https://manga-starz.net",
    description: "مانجا عربية — ترجمات عربية حصرية",
    haSearch: true,
    hasChapterList: true,
    flag: "⭐",
  },
  {
    id: "linkmanga",
    nameAr: "لينك مانجا",
    nameEn: "Link Manga",
    url: "https://link-manga.net",
    description: "مانجا عربية — مكتبة ضخمة",
    haSearch: true,
    hasChapterList: true,
    flag: "🔗",
  },
  {
    id: "dilar",
    nameAr: "ديلار",
    nameEn: "Dilar",
    url: "https://dilar.tube",
    description: "مانجا ومانهوا — API مباشر",
    haSearch: true,
    hasChapterList: true,
    flag: "📺",
  },
  {
    id: "olympus",
    nameAr: "أوليمبوس",
    nameEn: "Olympus Staff",
    url: "https://olympustaff.com",
    description: "مانجا — فريق TeamX",
    haSearch: false,
    hasChapterList: false,
    flag: "⚡",
  },
];

interface SourceContextValue {
  source: SourceId;
  sourceInfo: SourceInfo;
  setSource: (id: SourceId) => void;
}

const SourceContext = createContext<SourceContextValue>({
  source: "starz",
  sourceInfo: SOURCES[0]!,
  setSource: () => {},
});

const STORAGE_KEY = "app_manga_source";

async function loadSource(): Promise<SourceId> {
  try {
    if (Platform.OS === "web") {
      return (localStorage.getItem(STORAGE_KEY) as SourceId) ?? "starz";
    }
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return (v as SourceId) ?? "starz";
  } catch {
    return "starz";
  }
}

async function saveSource(id: SourceId): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(STORAGE_KEY, id);
      return;
    }
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function SourceProvider({ children }: { children: React.ReactNode }) {
  "use no memo";
  const [source, setSourceState] = useState<SourceId>("starz");

  useEffect(() => {
    loadSource().then((id) => setSourceState(id));
  }, []);

  const setSource = (id: SourceId) => {
    setSourceState(id);
    saveSource(id);
  };

  const sourceInfo = SOURCES.find((s) => s.id === source) ?? SOURCES[0]!;

  return (
    <SourceContext.Provider value={{ source, sourceInfo, setSource }}>
      {children}
    </SourceContext.Provider>
  );
}

export function useSource() {
  return useContext(SourceContext);
}
