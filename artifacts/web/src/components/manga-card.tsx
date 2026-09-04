import { Link } from 'wouter';
import { Star } from 'lucide-react';
import type { UnifiedManga } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface MangaCardProps {
  manga: UnifiedManga;
}

export function MangaCard({ manga }: MangaCardProps) {
  return (
    <Link href={`/manga/${manga.id}`} className="group block w-full space-y-2" data-testid={`card-manga-${manga.id}`}>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
        <img
          src={manga.coverUrl}
          alt={manga.title}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iIzY2NiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIENvdmVyPC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        {manga.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md" data-testid={`text-rating-${manga.id}`}>
            <Star className="h-3 w-3 fill-primary text-primary" />
            <span>{manga.rating}</span>
          </div>
        )}
        {manga.genres && manga.genres.length > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur-md" data-testid={`badge-genre-${manga.id}`}>
            <span className="truncate max-w-[80px]">{manga.genres[0]}</span>
          </div>
        )}
        {manga.latestChapterNum && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
            <span className="text-xs font-bold text-white shadow-black drop-shadow-md" data-testid={`text-chapter-${manga.id}`}>
              الفصل {manga.latestChapterNum}
            </span>
          </div>
        )}
      </div>
      <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-primary" title={manga.title} data-testid={`text-title-${manga.id}`}>
        {manga.title}
      </h3>
    </Link>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="w-full space-y-2">
      <Skeleton className="aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
