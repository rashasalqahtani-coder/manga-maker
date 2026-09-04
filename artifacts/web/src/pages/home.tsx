import { useState } from 'react';
import { useMostReadMangas, useHomeMangas, useSearchMangas } from '@/lib/api';
import { MangaCard, MangaCardSkeleton } from '@/components/manga-card';
import { Input } from '@/components/ui/input';
import { Search, Compass, Flame, BookOpen } from 'lucide-react';

import { useDebounce } from '@/hooks/use-debounce';

function SearchSection() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const { data: searchResults, isLoading: isSearchLoading } = useSearchMangas(debouncedQuery);
  const isLoading = isSearchLoading || query !== debouncedQuery;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="ابحث عن مانجا..." 
          className="pl-4 pr-10 py-6 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl text-base shadow-inner"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.length > 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            نتائج البحث
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <MangaCardSkeleton key={i} />)}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {searchResults.map((manga) => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center bg-card rounded-2xl border border-border">
              <Compass className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>لم يتم العثور على نتائج لـ "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MostReadSection() {
  const { data: mangas, isLoading, error } = useMostReadMangas();

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
        حدث خطأ أثناء تحميل الأكثر قراءة.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          الأكثر قراءة
        </h2>
      </div>
      
      <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[120px] sm:w-[140px] shrink-0 snap-start">
              <MangaCardSkeleton />
            </div>
          ))
        ) : (
          mangas?.map((manga) => (
            <div key={manga.id} className="w-[120px] sm:w-[140px] shrink-0 snap-start">
              <MangaCard manga={manga} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function HomeUpdatesSection() {
  const { data: mangas, isLoading, error } = useHomeMangas();

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
        حدث خطأ أثناء تحميل آخر التحديثات.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          آخر التحديثات
        </h2>
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <MangaCardSkeleton key={i} />
          ))
        ) : (
          mangas?.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))
        )}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}icon-512.png`} alt="Logo" className="h-8 w-8 rounded-lg shadow-sm" />
          <h1 className="text-xl font-black tracking-tight text-primary">مانجا ويب</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        <SearchSection />
        <MostReadSection />
        <HomeUpdatesSection />
      </main>
    </div>
  );
}