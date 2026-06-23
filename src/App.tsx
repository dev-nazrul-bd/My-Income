import React, { useState, useEffect } from "react";
import { onAuthStateChanged, auth, logoutUser } from "./lib/firebase";
import Login from "./components/Login";
import MainInterface from "./components/MainInterface";
import AdminPanel from "./components/AdminPanel";
import { LayoutDashboard, ShieldCheck, LogOut, Sun, Moon, Loader } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ActiveTab = "user" | "admin";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("user");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load and subscribe to Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // System Theme detector & sync
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const preferred = e.matches ? "dark" : "light";
      setTheme(preferred);
      if (preferred === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Initialize
    handleThemeChange(mediaQuery);

    // Listen to changes
    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center transition-colors duration-300">
        <Loader className="h-10 w-10 text-emerald-500 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-3">
          Loading "My Income" Ledger...
        </p>
      </div>
    );
  }

  // If not logged in, show login card
  if (!user) {
    return <Login onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-xl font-bold font-display shadow-xs select-none">
              <span className="text-2xl font-bold">৳</span>
            </div>
            <div>
              <span className="font-bold text-base text-gray-900 dark:text-white font-display uppercase tracking-wider block">
                My Income
              </span>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono block -mt-1">
                Portal v2.0
              </span>
            </div>
          </div>

          {/* Portal Switch Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800/80 p-1.5 rounded-xl border border-gray-100/50 dark:border-zinc-805">
            <button
              onClick={() => setActiveTab("user")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "user"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Main Ledger
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "admin"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Suite
            </button>
          </div>

          {/* Session Profile Action */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate max-w-[130px]">
                {user.email}
              </span>
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase font-mono">
                Session Saved
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 border border-gray-200 dark:border-zinc-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>

        </div>
      </nav>

      {/* Main Dynamic Workspace Body */}
      <main className="min-h-[calc(100vh-4rem)] p-2 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "user" ? (
              <MainInterface onLogout={handleLogout} />
            ) : (
              <AdminPanel />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
