import { X, Download, Share } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  // Show if Chromium prompt is available or it's an iOS device
  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-card p-4 shadow-xl border border-border sm:left-auto sm:w-96">
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-2 left-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <img src={`${import.meta.env.BASE_URL}icon-512.png`} alt="Logo" className="h-10 w-10 object-contain rounded-xl" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-card-foreground">قم بتثبيت التطبيق</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isIOS 
              ? 'أضف التطبيق للشاشة الرئيسية لتجربة قراءة أسرع.'
              : 'قم بتثبيت التطبيق للوصول السريع والقراءة بدون إنترنت.'
            }
          </p>
          
          <div className="mt-3">
            {isIOS ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                <span>1. اضغط</span>
                <Share className="h-4 w-4 text-foreground" />
                <span>2. أضف للشاشة الرئيسية</span>
              </div>
            ) : (
              <Button onClick={promptInstall} size="sm" className="w-full gap-2 font-bold">
                <Download className="h-4 w-4" />
                تثبيت الآن
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}