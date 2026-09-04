import { useParams, Link } from 'wouter';
import { useGetRorymMangaByGenre } from '@workspace/api-client-react';
import { ChevronRight, Hash, Compass, AlertCircle } from 'lucide-react';
import { MangaCard, MangaCardSkeleton } from '@/components/manga-card';
import type { UnifiedManga } from '@/lib/api';

export default function GenreView() {
  const params = useParams<{ genre: string }>();
  const genre = decodeURIComponent(params.genre || '');

  const { data, isLoading, error } = useGetRorymMangaByGenre(genre);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">عذرا، حدث خطأ أثناء تحميل التصنيف</h1>
        <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const mangas: UnifiedManga[] = (data?.manga || []).map(m => ({
    id: m.slug,
    slug: m.slug,
    title: m.title,
    coverUrl: m.coverUrl,
    url: m.url,
    sourceId: 'rorym',
    summary: m.summary,
    isMostRead: m.isMostRead,
    genres: m.genres,
    latestChapterNum: m.latestChapters?.[0]?.number,
    latestChapterUrl: m.latestChapters?.[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted -mr-2" data-testid="link-back">
            <ChevronRight className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2" data-testid={`text-genre-title-${genre}`}>
            <Hash className="h-5 w-5 text-primary" />
            {genre}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => <MangaCardSkeleton key={i} />)}
          </div>
        ) : mangas.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 animate-in fade-in duration-500">
            {mangas.map(manga => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center bg-card rounded-2xl border border-border">
            <Compass className="h-16 w-16 mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2 text-foreground">لا توجد أعمال</h2>
            <p>لم نجد أي مانجا في تصنيف "{genre}"</p>
          </div>
        )}
      </main>
    </div>
  );
}
