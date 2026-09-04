"use no memo";
import React, { createContext, useContext } from "react";

export type SourceId = "rorym";

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
    id: "rorym",
    nameAr: "روري م",
    nameEn: "Rory M",
    url: "/api/rorym",
    description: "مكتبة فرق الترجمة المحلية",
    haSearch: true,
    hasChapterList: true,
    flag: "📖",
  },
];

interface SourceContextValue {
  source: SourceId;
  sourceInfo: SourceInfo;
  setSource: (id: SourceId) => void;
}

const SourceContext = createContext<SourceContextValue>({
  source: "rorym",
  sourceInfo: SOURCES[0]!,
  setSource: () => {},
});

export function SourceProvider({ children }: { children: React.ReactNode }) {
  "use no memo";
  const source: SourceId = "rorym";
  const setSource = () => {};
  const sourceInfo = SOURCES[0]!;

  return (
    <SourceContext.Provider value={{ source, sourceInfo, setSource }}>
      {children}
    </SourceContext.Provider>
  );
}

export function useSource() {
  return useContext(SourceContext);
}
