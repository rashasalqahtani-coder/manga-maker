"use no memo";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export type SourceId = "linkmanga" | "kenmanga" | "asq";

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
    id: "kenmanga",
    nameAr: "أريا مانجا",
    nameEn: "AREA Manga",
    url: "https://ar.kenmanga.com",
    description: "مانجا ومانهوا — ترجمات عربية",
    haSearch: true,
    hasChapterList: true,
    flag: "🌙",
  },
  {
    id: "asq",
    nameAr: "مانجا العاشق",
    nameEn: "3asq Manga",
    url: "https://3asq.org",
    description: "مانجا عربية — كلاسيكيات وترجمات",
    haSearch: true,
    hasChapterList: true,
    flag: "📚",
  },
];

interface SourceContextValue {
  source: SourceId;
  sourceInfo: SourceInfo;
  setSource: (id: SourceId) => void;
}

const SourceContext = createContext<SourceContextValue>({
  source: "linkmanga",
  sourceInfo: SOURCES[0]!,
  setSource: () => {},
});

const STORAGE_KEY = "app_manga_source";

async function loadSource(): Promise<SourceId> {
  try {
    if (Platform.OS === "web") {
      return (localStorage.getItem(STORAGE_KEY) as SourceId) ?? "linkmanga";
    }
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return (v as SourceId) ?? "linkmanga";
  } catch {
    return "linkmanga";
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
  const [source, setSourceState] = useState<SourceId>("linkmanga");

  useEffect(() => {
    loadSource().then((id) => {
      // migrate old "starz" or "olympus" saved value to "linkmanga"
      if (id === ("starz" as string) || id === ("olympus" as string)) {
        setSourceState("linkmanga");
      } else {
        setSourceState(id);
      }
    });
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
