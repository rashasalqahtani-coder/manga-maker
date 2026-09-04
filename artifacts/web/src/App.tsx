import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from '@/pages/home';
import MangaDetail from '@/pages/manga-detail';
import GenreView from '@/pages/genre-view';
import { PWAInstallPrompt } from '@/components/install-prompt';
import ChapterReader from '@/pages/chapter-reader';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/manga/:id" component={MangaDetail} />
      <Route path="/manga/:id/chapter/:chapterNumber" component={ChapterReader} />
      <Route path="/genre/:genre" component={GenreView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
          <PWAInstallPrompt />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
