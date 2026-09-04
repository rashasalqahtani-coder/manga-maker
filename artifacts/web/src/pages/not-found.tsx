import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-sm w-full mx-auto space-y-6">
        <div className="text-8xl font-black text-primary/20 select-none">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            الصفحة غير موجودة
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </div>
        <Link href="/">
          <div className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground h-11 px-8 rounded-full font-bold hover:bg-primary/90 transition-colors cursor-pointer w-full shadow-lg shadow-primary/20">
            <ArrowRight className="h-5 w-5" />
            العودة للرئيسية
          </div>
        </Link>
      </div>
    </div>
  );
}