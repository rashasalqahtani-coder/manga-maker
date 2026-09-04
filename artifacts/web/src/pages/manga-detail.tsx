import { useParams, Link } from 'wouter';
import { useGetRorymManga, useGetRorymChapters } from '@workspace/api-client-react';
import { ChevronRight, Share2, BookOpen, AlertCircle, Bookmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MangaDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id || '';

  const { data: mangaData, isLoading: isMangaLoading, error: mangaError } = useGetRorymManga(id);
  const { data: chaptersData, isLoading: isChaptersLoading } = useGetRorymChapters(id);

  if (mangaError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">عذرا، لم نتمكن من تحميل المانجا</h1>
        <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const manga = mangaData?.manga;
  const chapters = chaptersData?.chapters || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted -mr-2" data-testid="link-back">
            <ChevronRight className="h-5 w-5" />
          </Link>
          <div className="flex gap-2">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Share">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {isMangaLoading || !manga ? (
        <MangaDetailSkeleton />
      ) : (
        <main className="container mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-40 md:w-64 shrink-0 mx-auto md:mx-0">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border border-border">
                <img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover" />
              </div>
            </div>
            
            <div className="flex-1 space-y-4 text-center md:text-right">
              <h1 className="text-2xl md:text-4xl font-black text-foreground leading-tight" data-testid="text-manga-title">
                {manga.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {manga.genres?.map(genre => (
                  <Link key={genre} href={`/genre/${encodeURIComponent(genre)}`} data-testid={`link-genre-${genre}`}>
                    <span className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold rounded-full transition-colors cursor-pointer block">
                      {genre}
                    </span>
                  </Link>
                ))}
              </div>

              {manga.summary && (
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-3xl" data-testid="text-manga-summary">
                  {manga.summary}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center md:justify-start">
                <button className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 gap-2 w-full sm:w-auto" data-testid="button-start-reading">
                  <BookOpen className="h-5 w-5" />
                  ابدأ القراءة
                </button>
                <button className="inline-flex h-12 items-center justify-center rounded-full bg-secondary px-8 text-sm font-bold text-secondary-foreground shadow-sm hover:bg-secondary/80 gap-2 w-full sm:w-auto" data-testid="button-add-list">
                  <Bookmark className="h-5 w-5" />
                  أضف للقائمة
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-border">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              الفصول ({chapters.length})
            </h2>
            
            {isChaptersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : chapters.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {chapters.map(chapter => (
                  <div key={chapter.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer group" data-testid={`card-chapter-${chapter.id}`}>
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {chapter.title || `الفصل ${chapter.number}`}
                    </span>
                    {chapter.uploadDate && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap mr-4">
                        {new Date(chapter.uploadDate).toLocaleDateString('ar-EG')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl border border-border">
                لا توجد فصول متاحة حاليا.
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

function MangaDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-40 md:w-64 shrink-0 mx-auto md:mx-0">
          <Skeleton className="aspect-[2/3] rounded-2xl" />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-3/4 mx-auto md:mx-0" />
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 mx-auto md:mx-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
