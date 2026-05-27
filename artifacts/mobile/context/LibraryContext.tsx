import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { TeamManga } from "@/context/TeamContext";
import type { Manga } from "@/lib/mangadex";

interface LibraryContextType {
  library: Manga[];
  isInLibrary: (id: string) => boolean;
  addToLibrary: (manga: Manga) => void;
  removeFromLibrary: (id: string) => void;
  toggleLibrary: (manga: Manga) => void;
  localLibrary: TeamManga[];
  isInLocalLibrary: (id: string) => boolean;
  addToLocalLibrary: (manga: TeamManga) => void;
  removeFromLocalLibrary: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextType>({
  library: [],
  isInLibrary: () => false,
  addToLibrary: () => {},
  removeFromLibrary: () => {},
  toggleLibrary: () => {},
  localLibrary: [],
  isInLocalLibrary: () => false,
  addToLocalLibrary: () => {},
  removeFromLocalLibrary: () => {},
});

const STORAGE_KEY = "@manga_library";
const LOCAL_STORAGE_KEY = "@local_manga_library";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Manga[]>([]);
  const [localLibrary, setLocalLibrary] = useState<TeamManga[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setLibrary(JSON.parse(raw) as Manga[]); } catch { /* ignore */ }
      }
    });
    AsyncStorage.getItem(LOCAL_STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setLocalLibrary(JSON.parse(raw) as TeamManga[]); } catch { /* ignore */ }
      }
    });
  }, []);

  const save = useCallback((items: Manga[]) => {
    setLibrary(items);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const saveLocal = useCallback((items: TeamManga[]) => {
    setLocalLibrary(items);
    AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const isInLibrary = useCallback(
    (id: string) => library.some((m) => m.id === id),
    [library]
  );

  const addToLibrary = useCallback(
    (manga: Manga) => {
      if (!library.some((m) => m.id === manga.id)) save([manga, ...library]);
    },
    [library, save]
  );

  const removeFromLibrary = useCallback(
    (id: string) => save(library.filter((m) => m.id !== id)),
    [library, save]
  );

  const toggleLibrary = useCallback(
    (manga: Manga) => {
      if (isInLibrary(manga.id)) removeFromLibrary(manga.id);
      else addToLibrary(manga);
    },
    [isInLibrary, addToLibrary, removeFromLibrary]
  );

  const isInLocalLibrary = useCallback(
    (id: string) => localLibrary.some((m) => m.id === id),
    [localLibrary]
  );

  const addToLocalLibrary = useCallback(
    (manga: TeamManga) => {
      if (!localLibrary.some((m) => m.id === manga.id))
        saveLocal([manga, ...localLibrary]);
      else
        saveLocal(localLibrary.map((m) => (m.id === manga.id ? manga : m)));
    },
    [localLibrary, saveLocal]
  );

  const removeFromLocalLibrary = useCallback(
    (id: string) => saveLocal(localLibrary.filter((m) => m.id !== id)),
    [localLibrary, saveLocal]
  );

  return (
    <LibraryContext.Provider
      value={{
        library, isInLibrary, addToLibrary, removeFromLibrary, toggleLibrary,
        localLibrary, isInLocalLibrary, addToLocalLibrary, removeFromLocalLibrary,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
