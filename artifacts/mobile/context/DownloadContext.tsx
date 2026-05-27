import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  deleteChapter,
  downloadChapter,
  downloadSourceChapter,
  getDownloadsMeta,
  isChapterDownloaded,
  type DownloadedChapterMeta,
} from "@/lib/download";
import type { Manga } from "@/lib/mangadex";

type DownloadStatus = "idle" | "downloading" | "done" | "error";

interface DownloadEntry {
  status: DownloadStatus;
  progress: number; // 0..1
  error?: string;
}

interface SourceChapterMeta {
  mangaTitle: string;
  chapterNum: string;
  coverUrl: string;
}

interface DownloadContextType {
  downloads: Record<string, DownloadEntry>;
  downloadedChapters: DownloadedChapterMeta[];
  startDownload: (chapterId: string, manga: Manga, chapterNum: string | null) => void;
  startSourceDownload: (chapterId: string, imageUrls: string[], meta: SourceChapterMeta) => void;
  cancelDownload: (chapterId: string) => void;
  removeDownload: (chapterId: string) => Promise<void>;
  refreshMeta: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType>({
  downloads: {},
  downloadedChapters: [],
  startDownload: () => {},
  startSourceDownload: () => {},
  cancelDownload: () => {},
  removeDownload: async () => {},
  refreshMeta: async () => {},
});

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Record<string, DownloadEntry>>({});
  const [downloadedChapters, setDownloadedChapters] = useState<DownloadedChapterMeta[]>([]);
  const cancelRefs = useRef<Record<string, { cancelled: boolean }>>({});

  const refreshMeta = useCallback(async () => {
    const meta = await getDownloadsMeta();
    setDownloadedChapters(meta);

    // Mark already-downloaded chapters as done in state
    const doneEntries: Record<string, DownloadEntry> = {};
    for (const m of meta) {
      const downloaded = await isChapterDownloaded(m.chapterId);
      if (downloaded) {
        doneEntries[m.chapterId] = { status: "done", progress: 1 };
      }
    }
    setDownloads((prev) => ({ ...doneEntries, ...prev }));
  }, []);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  const startDownload = useCallback(
    (chapterId: string, manga: Manga, chapterNum: string | null) => {
      const alreadyActive = downloads[chapterId]?.status === "downloading";
      if (alreadyActive) return;

      const signal = { cancelled: false };
      cancelRefs.current[chapterId] = signal;

      setDownloads((prev) => ({
        ...prev,
        [chapterId]: { status: "downloading", progress: 0 },
      }));

      downloadChapter(
        chapterId,
        manga,
        chapterNum,
        (downloaded, total) => {
          setDownloads((prev) => ({
            ...prev,
            [chapterId]: {
              status: "downloading",
              progress: downloaded / total,
            },
          }));
        },
        signal
      )
        .then(() => {
          setDownloads((prev) => ({
            ...prev,
            [chapterId]: { status: "done", progress: 1 },
          }));
          refreshMeta();
        })
        .catch((err: Error) => {
          if (err.message === "cancelled") {
            setDownloads((prev) => {
              const next = { ...prev };
              delete next[chapterId];
              return next;
            });
          } else {
            setDownloads((prev) => ({
              ...prev,
              [chapterId]: { status: "error", progress: 0, error: err.message },
            }));
          }
        });
    },
    [downloads, refreshMeta]
  );

  const startSourceDownload = useCallback(
    (chapterId: string, imageUrls: string[], meta: SourceChapterMeta) => {
      if (downloads[chapterId]?.status === "downloading") return;

      const signal = { cancelled: false };
      cancelRefs.current[chapterId] = signal;

      setDownloads((prev) => ({
        ...prev,
        [chapterId]: { status: "downloading", progress: 0 },
      }));

      downloadSourceChapter(
        chapterId,
        imageUrls,
        meta.mangaTitle,
        meta.chapterNum,
        meta.coverUrl,
        (downloaded, total) => {
          setDownloads((prev) => ({
            ...prev,
            [chapterId]: { status: "downloading", progress: downloaded / total },
          }));
        },
        signal
      )
        .then(() => {
          setDownloads((prev) => ({
            ...prev,
            [chapterId]: { status: "done", progress: 1 },
          }));
          refreshMeta();
        })
        .catch((err: Error) => {
          if (err.message === "cancelled") {
            setDownloads((prev) => {
              const next = { ...prev };
              delete next[chapterId];
              return next;
            });
          } else {
            setDownloads((prev) => ({
              ...prev,
              [chapterId]: { status: "error", progress: 0, error: err.message },
            }));
          }
        });
    },
    [downloads, refreshMeta]
  );

  const cancelDownload = useCallback((chapterId: string) => {
    if (cancelRefs.current[chapterId]) {
      cancelRefs.current[chapterId].cancelled = true;
    }
  }, []);

  const removeDownload = useCallback(
    async (chapterId: string) => {
      cancelDownload(chapterId);
      await deleteChapter(chapterId);
      setDownloads((prev) => {
        const next = { ...prev };
        delete next[chapterId];
        return next;
      });
      await refreshMeta();
    },
    [cancelDownload, refreshMeta]
  );

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        downloadedChapters,
        startDownload,
        startSourceDownload,
        cancelDownload,
        removeDownload,
        refreshMeta,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  return useContext(DownloadContext);
}
