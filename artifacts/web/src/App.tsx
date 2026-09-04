import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Link } from 'wouter';
import Home from '@/pages/home';
import { PWAInstallPrompt } from '@/components/install-prompt';
import { ArrowRight } from 'lucide-react';

const queryClient = new QueryClient();

function MangaDetailPlaceholder({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-4">
        <span className="font-bold text-xl">؟</span>
      </div>
      <h1 className="text-2xl font-bold">تفاصيل المانجا</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        المعرف: {params.id}
        <br />
        هذه الصفحة قيد التطوير.
      </p>
      <Link href="/" className="mt-8 flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors">
        <ArrowRight className="h-4 w-4" />
        العودة للرئيسية
      </Link>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/manga/:id" component={MangaDetailPlaceholder} />
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