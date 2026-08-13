"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import Link from "next/link";
import CheckInModal from "../components/CheckInModal"; 
import ThemeToggle from "../components/ThemeToggle"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [userName, setUserName] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const [unreadPersonal, setUnreadPersonal] = useState<number>(0);
  const [unreadGlobal, setUnreadGlobal] = useState<number>(0);
  const [appSettings, setAppSettings] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const dateObj = new Date();
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });
      setCurrentDate(formattedDate);

      // ১. ইউজার অ্যাকাউন্ট তৈরির তারিখ বের করার শক্তিশালী লজিক
      let userCreationMillis = 0;
      if (user?.metadata?.creationTime) {
        userCreationMillis = new Date(user.metadata.creationTime).getTime();
      }

      const fetchUserProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (!userDoc.exists()) {
            alert("Your account has been deleted by the administrator.");
            await signOut(auth);
            router.push("/login");
            return;
          }

          const userData = userDoc.data();

          if (userData?.status === "suspended" || userData?.isSuspended === true || userData?.status === "inactive") {
            alert("Your account has been suspended. Please contact support.");
            await signOut(auth);
            router.push("/login");
            return;
          }

          if (userData.name) {
            setUserName(userData.name);
          } else {
            setUserName(user.email?.split("@")[0] || "User");
          }

          // যদি Auth metadata তে তারিখ না থাকে, তবে Firestore Profile-এর createdAt নেওয়া হবে
          if (!userCreationMillis && userData?.createdAt) {
            if (typeof userData.createdAt.toMillis === "function") {
              userCreationMillis = userData.createdAt.toMillis();
            } else if (userData.createdAt.seconds) {
              userCreationMillis = userData.createdAt.seconds * 1000;
            } else {
              userCreationMillis = new Date(userData.createdAt).getTime();
            }
          }
        } catch (error) {
          console.error("Error checking user status:", error);
        }
      };
      
      fetchUserProfile();

      // ২. পার্সোনাল আনরিড নোটিফিকেশন ফেচ করা
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("isRead", "==", false)
      );

      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const count = snapshot.docs.length;
        console.log("🔍 Personal Unread Notifications:", count);
        setUnreadPersonal(count);
      });

      // টাইমস্ট্যাম্প কনভার্ট করার জন্য হেল্পার ফাংশন
      const getTime = (timestamp: any) => {
        if (!timestamp) return 0;
        if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
        if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
        if (timestamp.seconds) return timestamp.seconds * 1000;
        return new Date(timestamp).getTime() || 0;
      };

      // ৩. গ্লোবাল অ্যানাউন্সমেন্ট ফেচ ও ফিল্টারিং
      let fetchedAnnouncements: any[] = [];
      const updateGlobalCount = () => {
        const readIds = JSON.parse(localStorage.getItem(`readAnnouncements_${user.uid}`) || "[]");
        
        const unread = fetchedAnnouncements.filter(docSnap => {
          const annId = docSnap.id;
          const annData = docSnap.data();

          // ইতিমধ্যে পড়া থাকলে বাদ
          if (readIds.includes(annId)) return false;

          // অ্যাকাউন্ট তৈরির আগের অ্যানাউন্সমেন্ট হলে বাদ
          if (userCreationMillis > 0) {
            const annTime = getTime(annData.createdAt);
            // অ্যানাউন্সমেন্ট তৈরির সময় ইউজার সাইনআপের আগের হলে বাদ যাবে
            if (annTime > 0 && annTime < userCreationMillis - 60000) {
              return false;
            }
          }

          return true;
        });

        console.log("🔍 Global Unread Announcements:", unread.length);
        setUnreadGlobal(unread.length);
      };

      const announcementsQuery = query(collection(db, "announcements"));
      const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
        fetchedAnnouncements = snapshot.docs;
        updateGlobalCount();
      });

      window.addEventListener("announcementRead", updateGlobalCount);

      // ৪. গ্লোবাল সেটিংস ফেচ করা
      const unsubscribeSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
        if (docSnap.exists()) {
          setAppSettings(docSnap.data());
        }
      });

      return () => {
        unsubscribeNotifications();
        unsubscribeAnnouncements();
        unsubscribeSettings();
        window.removeEventListener("announcementRead", updateGlobalCount);
      };
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  const totalUnreadCount = unreadPersonal + unreadGlobal;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex font-sans text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden transition-opacity"
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 h-screen transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}>
        <div>
          <div className="h-[73px] px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-3xl drop-shadow-sm">🧠</span>
              <div className="leading-tight mt-1">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">MindPulse</h1>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Smart Wellness</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1"
            >
              ✕
            </button>
          </div>

          <nav className="mt-6 space-y-1 px-4" onClick={() => setIsMobileMenuOpen(false)}>
            <SidebarLink href="/dashboard" active={pathname === "/dashboard"} icon={<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>}>Dashboard</SidebarLink>
            <SidebarLink href="/checkin" active={pathname === "/checkin"} icon={<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>}>Daily Check-In</SidebarLink>
            
            {appSettings?.enableJournals !== false && (
              <SidebarLink href="/journal" active={pathname === "/journal"} icon={<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>}>Journal</SidebarLink>
            )}

            <SidebarLink href="/chat" active={pathname === "/chat"} icon={<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>}>AI Assistant</SidebarLink>
            <SidebarLink href="/reports" active={pathname === "/reports"} icon={<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>}>Analytics & Reports</SidebarLink>
            <SidebarLink href="/wellness-tips" active={pathname === "/wellness-tips"} icon={<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>}>Wellness Tips</SidebarLink>
            <SidebarLink href="/profile" active={pathname === "/profile"} icon={<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>}>Profile</SidebarLink>
            <SidebarLink href="/settings" active={pathname === "/settings"} icon={<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>}>Settings</SidebarLink>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h8v-2H4V5z"/></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col md:ml-64 h-screen w-full">
        
        {/* GLOBAL TOP BAR */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[73px] shrink-0 sticky top-0 z-30 flex justify-between items-center px-4 md:px-8 w-full transition-colors duration-200">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 bg-transparent rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            
            <div className="hidden sm:block">
              <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider">{currentDate}</p>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-none">Welcome back, {userName}! 👋</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            
            <ThemeToggle />

            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition"
            >
              <span>+</span> <span className="hidden sm:inline">New Check-In</span><span className="sm:hidden">Check-In</span>
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* Dynamic Notification Bell */}
            <Link href="/notifications" className="relative p-2 bg-slate-50 dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition block">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {totalUnreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-pulse">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </span>
              )}
            </Link>

            <Link href="/profile" className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 pl-1 pr-3 md:pr-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs md:text-sm shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 hidden sm:block">{userName}</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content Area */}
        <main className="flex-1 w-full overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-200">
          {appSettings?.maintenanceMode ? (
            <div className="h-[calc(100vh-73px)] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-3xl shadow-sm text-center max-w-lg w-full border border-slate-100 dark:border-slate-800">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🛠️</div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">We'll be right back!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                  MindPulse is currently undergoing scheduled maintenance to improve your experience. We appreciate your patience and will be back online shortly.
                </p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <CheckInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={user.uid}
        onSuccess={() => setIsModalOpen(false)}
      />
    </div>
  );
}

function SidebarLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
        active 
          ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" 
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
      }`}
    >
      <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">{icon}</svg>
      <span>{children}</span>
    </Link>
  );
}