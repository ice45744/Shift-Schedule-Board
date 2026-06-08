import { Link, useLocation } from "wouter";
import { Settings, CalendarDays } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "hsl(222 47% 5%)" }}>
      {/* 3D Sidebar Nav */}
      <nav
        className="w-14 flex flex-col items-center py-4 gap-3 flex-shrink-0 z-20"
        style={{
          background: "linear-gradient(180deg, hsl(222 47% 7%) 0%, hsl(222 47% 6%) 100%)",
          borderRight: "1px solid hsl(217 33% 12%)",
          boxShadow: "4px 0 24px hsl(0 0% 0% / 0.4), inset -1px 0 0 hsl(217 33% 16%)",
        }}
      >
        {/* Logo */}
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center mb-4 text-xs font-black"
          style={{
            background: "linear-gradient(135deg, hsl(186 100% 50%) 0%, hsl(186 100% 38%) 100%)",
            color: "hsl(222 84% 5%)",
            boxShadow: "0 0 20px hsl(186 100% 50% / 0.4), 0 4px 12px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(186 100% 80% / 0.3)",
          }}
        >
          ตว
        </div>

        {/* Schedule link */}
        <Link href="/">
          <div
            className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer"
            style={
              location === "/"
                ? {
                    background: "linear-gradient(135deg, hsl(186 100% 50% / 0.2), hsl(186 100% 50% / 0.08))",
                    color: "hsl(186 100% 60%)",
                    boxShadow: "0 0 16px hsl(186 100% 50% / 0.2), inset 0 1px 0 hsl(186 100% 50% / 0.15), 0 0 0 1px hsl(186 100% 50% / 0.2)",
                  }
                : {
                    color: "hsl(215 20% 40%)",
                  }
            }
            data-testid="nav-schedule"
          >
            <CalendarDays className="w-5 h-5" />
          </div>
        </Link>

        {/* Settings link */}
        <Link href="/settings">
          <div
            className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer"
            style={
              location === "/settings"
                ? {
                    background: "linear-gradient(135deg, hsl(186 100% 50% / 0.2), hsl(186 100% 50% / 0.08))",
                    color: "hsl(186 100% 60%)",
                    boxShadow: "0 0 16px hsl(186 100% 50% / 0.2), inset 0 1px 0 hsl(186 100% 50% / 0.15), 0 0 0 1px hsl(186 100% 50% / 0.2)",
                  }
                : {
                    color: "hsl(215 20% 40%)",
                  }
            }
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5" />
          </div>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
