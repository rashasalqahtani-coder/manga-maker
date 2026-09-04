import { useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { useGetRorymManga, useGetRorymChapters } from '@workspace/api-client-react';
import { AlertCircle, ArrowRight, BookOpen, CalendarDays, RefreshCw, Share2, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function ErrorState({ retry }: { retry: () => void }) {
  const offline = !navigator.onLine;
  return (
    <div className="min-h-[60vh] grid place-items-center px-4 text-center" data-testid="status-detail-error">
      <div className="max-w-sm space-y-4">
        {offline ? <WifiOff className="mx-auto h-10 w-10 text-muted-foreground" /> : <AlertCircle className="mx-auto h-10 w-10 text-destructive" />}
        <h1 className="text-xl font-bold">{offline ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر تحميل تفاصيل المانجا'}</h1>
        <p className="text-sm text-muted-foreground">{offline ? 'تحقق من اتصالك ثم حاول مرة أخرى.' : 'قد تكون الصفحة غير متاحة مؤقتًا.'}</p>
        <Button onClick={retry} data-testid="button-retry-detail"><RefreshCw /> إعادة المحاولة</Button>
      </div>
    </div>
  );
}

function MangaDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8" data-testid="status-detail-loading">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-40 md:w-64 shrink-0 mx-auto md:mx-0"><Skeleton className="aspect-[2/3] rounded-2xl" /></div>
        <div className="flex-1 space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-8 w-48 rounded-full" /><Skeleton className="h-28 w-full" /></div>
      </div>
    </div>
  );
}

export default function MangaDetail() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id || '');
  const mangaQuery = useGetRorymManga(id);
  const chaptersQuery = useGetRorymChapters(id);
  const manga = mangaQuery.data?.manga;
  const chapters = chaptersQuery.data?.chapters ?? [];

  useEffect(() => {
    document.title = manga ? `${manga.title} | مانجا ويب` : 'تفاصيل المانجا | مانجا ويب';
    return () => { document.title = 'مانجا ويب'; };
  }, [manga]);

  if (mangaQuery.isLoading || chaptersQuery.isLoading) return <MangaDetailSkeleton />;
  if (mangaQuery.error || chaptersQuery.error || !manga) {
    return <ErrorState retry={() => { void mangaQuery.refetch(); void chaptersQuery.refetch(); }} />;
  }

  const firstChapter = chapters[0];
  const sharePage = () => {
    if (navigator.share) void navigator.share({ title: manga.title, url: window.location.href });
    else void navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full px-3 hover:bg-muted" data-testid="link-back"><ArrowRight className="h-5 w-5" /> الرئيسية</Link>
          <button onClick={sharePage} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="مشاركة" data-testid="button-share"><Share2 className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-40 md:w-64 shrink-0 mx-auto md:mx-0"><div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border"><img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover" data-testid="img-manga-cover" /></div></div>
          <div className="flex-1 space-y-4 text-center md:text-right">
            <h1 className="text-2xl md:text-4xl font-black leading-tight" data-testid="text-manga-title">{manga.title}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {manga.genres?.map((genre) => <Link key={genre} href={`/genre/${encodeURIComponent(genre)}`} data-testid={`link-genre-${genre}`}><span className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-sm font-semibold rounded-full block">{genre}</span></Link>)}
            </div>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-3xl whitespace-pre-line" data-testid="text-manga-summary">{manga.summary || 'لا يتوفر وصف لهذه المانجا.'}</p>
            {firstChapter && <Button asChild className="rounded-full px-8" data-testid="button-start-reading"><Link href={`/manga/${encodeURIComponent(id)}/chapter/${encodeURIComponent(firstChapter.number)}`}><BookOpen /> ابدأ القراءة</Link></Button>}
          </div>
        </div>

        <section className="space-y-4 pt-6 border-t">
          <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> الفصول ({chapters.length})</h2>
          {chapters.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {chapters.map((chapter) => (
                <Link key={chapter.id} href={`/manga/${encodeURIComponent(id)}/chapter/${encodeURIComponent(chapter.number)}`} className="flex items-center justify-between p-4 rounded-xl bg-card border hover:border-primary/50 transition-colors group" data-testid={`link-chapter-${chapter.number}`}>
                  <div><span className="font-semibold group-hover:text-primary">الفصل {chapter.number}</span>{chapter.title && <p className="text-xs text-muted-foreground mt-1">{chapter.title}</p>}</div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap mr-4"><CalendarDays className="h-4 w-4" />{chapter.uploadDate ? new Date(chapter.uploadDate).toLocaleDateString('ar-EG') : `${chapter.pages.length} صفحة`}</span>
                </Link>
              ))}
            </div>
          ) : <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl border" data-testid="status-chapters-empty">لا توجد فصول متاحة حاليًا.</div>}
        </section>
      </main>
    </div>
  );
}