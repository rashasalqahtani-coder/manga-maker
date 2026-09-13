import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronLeft, ChevronRight, Images, RefreshCw, WifiOff } from 'lucide-react';
import { useManga, useMangaChapters } from '@/lib/api';
import { Button } from '@/components/ui/button';

function ReaderPage({ src, index, chapterNumber }: { src: string; index: number; chapterNumber: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div data-reader-page={index + 1} data-testid={`reader-page-${index + 1}`} className="grid min-h-[40vh] w-full place-items-center bg-neutral-950">
      {failed ? (
        <div className="p-8 text-center text-white/60" data-testid={`status-page-error-${index + 1}`}>
          <Images className="mx-auto mb-3 h-8 w-8" />
          <p>تعذّر تحميل الصفحة {index + 1}</p>
        </div>
      ) : (
        <img src={src} alt={`صفحة ${index + 1} من الفصل ${chapterNumber}`} loading={index < 2 ? 'eager' : 'lazy'} onError={() => setFailed(true)} className="mx-auto block h-auto w-full object-contain" />
      )}
    </div>
  );
}

export default function ChapterReader({ params }: { params: { id: string; chapterNumber: string } }) {
  const slug = decodeURIComponent(params.id);
  const chapterNumber = decodeURIComponent(params.chapterNumber);
  const mangaQuery = useManga(slug);
  const chaptersQuery = useMangaChapters(slug);
  const [currentPage, setCurrentPage] = useState(1);
  const chapter = chaptersQuery.data?.find((item) => item.number === chapterNumber);
  const orderedChapters = [...(chaptersQuery.data ?? [])].sort(
    (a, b) => Number.parseFloat(b.number) - Number.parseFloat(a.number),
  );
  const currentChapterIndex = orderedChapters.findIndex((item) => item.number === chapterNumber);
  const nextChapter =
    currentChapterIndex > 0 ? orderedChapters[currentChapterIndex - 1] : null;
  const previousChapter =
    currentChapterIndex >= 0 && currentChapterIndex < orderedChapters.length - 1
      ? orderedChapters[currentChapterIndex + 1]
      : null;

  const chapterHref = (number: string) =>
    `/manga/${encodeURIComponent(slug)}/chapter/${encodeURIComponent(number)}`;

  useEffect(() => {
    const title = mangaQuery.data?.title;
    document.title = title ? `الفصل ${chapterNumber} - ${title}` : `الفصل ${chapterNumber} | مانجا ويب`;
    return () => { document.title = 'مانجا ويب'; };
  }, [chapterNumber, mangaQuery.data?.title]);

  useEffect(() => {
    const updatePage = () => {
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-reader-page]')];
      if (!nodes.length) return;
      const center = window.innerHeight / 2;
      const closest = nodes.reduce((best, node) => Math.abs(node.getBoundingClientRect().top - center) < Math.abs(best.getBoundingClientRect().top - center) ? node : best);
      setCurrentPage(Number(closest.dataset.readerPage) || 1);
    };
    window.addEventListener('scroll', updatePage, { passive: true });
    return () => window.removeEventListener('scroll', updatePage);
  }, [chapter?.pages.length]);

  if (mangaQuery.isLoading || chaptersQuery.isLoading) {
    return <div className="fixed inset-0 grid place-items-center bg-black text-white" data-testid="status-reader-loading"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-primary" /><p>جارٍ تحميل الفصل...</p></div></div>;
  }

  if (mangaQuery.error || chaptersQuery.error || !chapter || chapter.pages.length === 0) {
    const offline = !navigator.onLine;
    return <div className="fixed inset-0 grid place-items-center bg-black px-4 text-center text-white" data-testid="status-reader-error"><div className="space-y-4">{offline ? <WifiOff className="mx-auto h-10 w-10 text-white/60" /> : <Images className="mx-auto h-10 w-10 text-white/60" />}<h1 className="text-xl font-bold">{offline ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر تحميل الفصل'}</h1><p className="text-sm text-white/60">تحقق من الاتصال أو عُد إلى قائمة الفصول وحاول مجددًا.</p><div className="flex justify-center gap-2"><Button onClick={() => { void mangaQuery.refetch(); void chaptersQuery.refetch(); }} data-testid="button-retry-reader"><RefreshCw /> إعادة المحاولة</Button><Button asChild variant="secondary"><Link href={`/manga/${encodeURIComponent(slug)}`} data-testid="link-back-to-manga">الفصول</Link></Button></div></div></div>;
  }

  return (
    <main className="min-h-screen bg-black pb-20 text-white" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 px-3 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href={`/manga/${encodeURIComponent(slug)}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10" aria-label="العودة إلى الفصول" data-testid="link-reader-back"><ArrowRight /></Link>
          <div className="min-w-0 text-center"><h1 className="truncate text-sm text-white/65" data-testid="text-reader-manga-title">{mangaQuery.data?.title}</h1><p className="font-bold" data-testid="text-reader-chapter">الفصل {chapterNumber}</p></div>
          <div className="w-10" />
        </div>
      </header>
      <div className="mx-auto max-w-5xl">
        {chapter.pages.map((page, index) => (
          <ReaderPage key={`${page}-${index}`} src={page} index={index} chapterNumber={chapterNumber} />
        ))}
      </div>
      <nav
        className="fixed bottom-4 left-1/2 z-40 flex w-[min(94vw,34rem)] -translate-x-1/2 items-center justify-between gap-2 rounded-2xl bg-black/85 p-2 shadow-xl ring-1 ring-white/15 backdrop-blur"
        aria-label="التنقل بين الفصول"
      >
        {nextChapter ? (
          <Link
            href={chapterHref(nextChapter.number)}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            data-testid="link-next-chapter"
          >
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span className="truncate">الفصل التالي {nextChapter.number}</span>
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-white/35">
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span>الفصل التالي</span>
          </span>
        )}
        <span className="text-white/20">|</span>
        {previousChapter ? (
          <Link
            href={chapterHref(previousChapter.number)}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            data-testid="link-previous-chapter"
          >
            <span className="truncate">الفصل السابق {previousChapter.number}</span>
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-white/35">
            <span>الفصل السابق</span>
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </span>
        )}
      </nav>
      <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-sm shadow-xl ring-1 ring-white/15 backdrop-blur" data-testid="text-page-counter">{currentPage} / {chapter.pages.length}</div>
    </main>
  );
}