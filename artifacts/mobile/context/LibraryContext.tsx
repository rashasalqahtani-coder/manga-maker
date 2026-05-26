import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { Manga } from "@/lib/mangadex";

interface LibraryContextType {
  library: Manga[];
  isInLibrary: (id: string) => boolean;
  addToLibrary: (manga: Manga) => void;
  removeFromLibrary: (id: string) => void;
  toggleLibrary: (manga: Manga) => void;
}

const LibraryContext = createContext<LibraryContextType>({
  library: [],
  isInLibrary: () => false,
  addToLibrary: () => {},
  removeFromLibrary: () => {},
  toggleLibrary: () => {},
});

const STORAGE_KEY = "@manga_library";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Manga[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setLibrary(JSON.parse(raw) as Manga[]);
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const save = useCallback((items: Manga[]) => {
    setLibrary(items);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const isInLibrary = useCallback(
    (id: string) => library.some((m) => m.id === id),
    [library]
  );

  const addToLibrary = useCallback(
    (manga: Manga) => {
      if (!library.some((m) => m.id === manga.id)) {
        save([manga, ...library]);
      }
    },
    [library, save]
  );

  const removeFromLibrary = useCallback(
    (id: string) => {
      save(library.filter((m) => m.id !== id));
    },
    [library, save]
  );

  const toggleLibrary = useCallback(
    (manga: Manga) => {
      if (isInLibrary(manga.id)) {
        removeFromLibrary(manga.id);
      } else {
        addToLibrary(manga);
      }
    },
    [isInLibrary, addToLibrary, removeFromLibrary]
  );

  return (
    <LibraryContext.Provider
      value={{ library, isInLibrary, addToLibrary, removeFromLibrary, toggleLibrary }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
