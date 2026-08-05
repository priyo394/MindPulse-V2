"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../lib/firebase"; 
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import ThemeToggle from "../components/ThemeToggle"; // 👈 ThemeToggle Import kora holo

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ফায়ারবেস থেকে লাইভ নোটিফিকেশন বা অ্যাক্টিভিটি লগ ফেচ করা
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const q = query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(5));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(list);
        setUnreadCount(list.length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
    { name: "Manage Users", href: "/admin/users", icon: "👥" },
    { name: "Analytics & Reports", href: "/admin/analytics", icon: "📈" },
    { name: "Check-in Reports", href: "/admin/check-ins", icon: "📋" },
    { name: "Journal Reports", href: "/admin/journals", icon: "📖" },
    { name: "Wellness Tips", href: "/admin/wellness-tips", icon: "💡" },
    { name: "Announcements", href: "/admin/announcements", icon: "📢" },
    { name: "Activity Logs", href: "/admin/activity-logs", icon: "🕒" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden relative transition-colors duration-200">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden transition-opacity"
        ></div>
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] dark:bg-slate-900 text-slate-300 dark:border-r dark:border-slate-800 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Logo Area */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl drop-shadow-md">🧠</span>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">MindPulse</h1>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Admin Panel</span>
              </div>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
          
          <nav className="space-y-1.5" onClick={() => setIsMobileMenuOpen(false)}>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "hover:bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (Profile & Logout) */}
        <div className="p-5 border-t border-slate-800 dark:border-slate-800 bg-[#0b1120] dark:bg-slate-950">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        
        {/* Uniform Top Bar */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-[73px] px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors duration-200">
          
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              aria-label="Open Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>

            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hidden sm:block">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <h2 className="text-base md:text-xl font-extrabold text-slate-800 dark:text-white">MindPulse Administration</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            
            {/* ☀️/🌙 Theme Toggle Add Kora Holo */}
            <ThemeToggle />

            {/* Notification Bell with Functional Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadCount(0);
                }}
                className="relative p-2.5 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                aria-label="Notifications"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-800 animate-pulse"></span>
                )}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>

              {/* Notification Dropdown Box */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">System Notifications</h4>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">Live Logs</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                        No new notifications found.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{notif.action || "System Event"}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.details || notif.userName}</p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
                    <Link href="/admin/activity-logs" onClick={() => setShowNotifications(false)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                      View All Activity Logs →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Top Bar Profile */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full py-1.5 px-1.5 pr-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                {user?.email ? user.email.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:block">Admin User</span>
            </div>

          </div>
        </header>

        {/* Page Children go here */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 transition-colors duration-200">
          {children}
        </main>
      </main>
    </div>
  );
}