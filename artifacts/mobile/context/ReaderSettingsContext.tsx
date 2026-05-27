import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ReadingDirection = "rtl" | "ltr" | "vertical";
export type ReadingMode = "pages" | "scroll";

export interface ReaderSettings {
  direction: ReadingDirection;
  mode: ReadingMode;
  highQuality: boolean;
  keepScreenOn: boolean;
}

interface ReaderSettingsContextType extends ReaderSettings {
  setDirection: (d: ReadingDirection) => void;
  setMode: (m: ReadingMode) => void;
  setHighQuality: (v: boolean) => void;
  setKeepScreenOn: (v: boolean) => void;
}

const DEFAULTS: ReaderSettings = {
  direction: "rtl",
  mode: "pages",
  highQuality: false,
  keepScreenOn: true,
};

const KEY = "@reader_settings";

const ReaderSettingsContext = createContext<ReaderSettingsContextType>({
  ...DEFAULTS,
  setDirection: () => {},
  setMode: () => {},
  setHighQuality: () => {},
  setKeepScreenOn: () => {},
});

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try { setSettings((p) => ({ ...p, ...(JSON.parse(raw) as Partial<ReaderSettings>) })); }
        catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  function update<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  return (
    <ReaderSettingsContext.Provider value={{
      ...settings,
      setDirection: (d) => update("direction", d),
      setMode: (m) => update("mode", m),
      setHighQuality: (v) => update("highQuality", v),
      setKeepScreenOn: (v) => update("keepScreenOn", v),
    }}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  return useContext(ReaderSettingsContext);
}
