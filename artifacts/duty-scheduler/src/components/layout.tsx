import { Link, useLocation } from "wouter";
import { Settings, Calendar } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <div className="w-16 flex flex-col items-center py-4 border-r bg-card border-border flex-shrink-0 z-10">
        <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-8 font-bold">
          ตว
        </div>
        
        <nav className="flex flex-col gap-4">
          <Link href="/">
            <div className={`p-3 rounded-xl transition-colors ${location === "/" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              <Calendar className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/settings">
            <div className={`p-3 rounded-xl transition-colors ${location === "/settings" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              <Settings className="w-5 h-5" />
            </div>
          </Link>
        </nav>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
