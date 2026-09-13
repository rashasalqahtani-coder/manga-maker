type DownloadCompletedListener = () => void;

const downloadCompletedListeners = new Set<DownloadCompletedListener>();

export function recordCompletedChapterDownload(): void {
  downloadCompletedListeners.forEach((listener) => listener());
}

export function subscribeToCompletedChapterDownloads(
  listener: DownloadCompletedListener,
): () => void {
  downloadCompletedListeners.add(listener);
  return () => downloadCompletedListeners.delete(listener);
}