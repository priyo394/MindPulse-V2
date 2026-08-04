"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // ১. ইউজারের পার্সোনাল নোটিফিকেশন ফেচ করা
    const qNotif = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribeNotif = onSnapshot(qNotif, (snapshot) => {
      const notifData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isGlobal: false
      }));
      setNotifications(notifData);
    });

    // ২. অ্যাডমিন প্যানেল থেকে গ্লোবাল 'Announcements' ফেচ করা (এখানে লোকাল স্টোরেজ চেক করা হচ্ছে)
    const qAnnounce = query(collection(db, "announcements"));

    const unsubscribeAnnounce = onSnapshot(qAnnounce, (snapshot) => {
      const readIds = JSON.parse(localStorage.getItem(`readAnnouncements_${user.uid}`) || "[]");
      const annData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isGlobal: true, 
        isRead: readIds.includes(doc.id) // <-- লোকাল স্টোরেজ থেকে চেক করবে পড়া হয়েছে কিনা
      }));
      setAnnouncements(annData);
      setIsLoading(false);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeAnnounce();
    };
  }, [user]);

  // পার্সোনাল এবং গ্লোবাল ডেটা একসাথে মার্জ করে সময় (createdAt) অনুযায়ী সাজানো (Safe Way)
  const allMessages = [...notifications, ...announcements].sort((a, b) => {
    const getTime = (timestamp: any) => {
      if (!timestamp) return 0;
      if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
      if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
      if (timestamp.seconds) return timestamp.seconds * 1000;
      return new Date(timestamp).getTime() || 0;
    };
    return getTime(b.createdAt) - getTime(a.createdAt);
  });

  // নোটিফিকেশনে ক্লিক করলে রিড হিসেবে মার্ক হবে এবং কাউন্ট কমবে
  const markAsRead = async (id: string, isRead: boolean, isGlobal: boolean) => {
    if (isRead) return;
    if (!user) return;
    
    if (isGlobal) {
      // গ্লোবাল মেসেজের জন্য লোকাল স্টোরেজ আপডেট
      const readIds = JSON.parse(localStorage.getItem(`readAnnouncements_${user.uid}`) || "[]");
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`readAnnouncements_${user.uid}`, JSON.stringify(readIds));
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
        window.dispatchEvent(new Event("announcementRead")); // বেল আইকনের কাউন্ট কমানোর ট্রিগার
      }
    } else {
      // পার্সোনাল মেসেজের জন্য ফায়ারবেস আপডেট
      try {
        await updateDoc(doc(db, "notifications", id), { isRead: true });
      } catch (error) {
        console.error("Error updating notification:", error);
      }
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    // পার্সোনাল নোটিফিকেশন রিড করা
    const unreadPersonal = notifications.filter(n => !n.isRead);
    if (unreadPersonal.length > 0) {
      try {
        const batch = writeBatch(db);
        unreadPersonal.forEach(notif => batch.update(doc(db, "notifications", notif.id), { isRead: true }));
        await batch.commit();
      } catch (error) {
        console.error("Error marking all as read:", error);
      }
    }

    // গ্লোবাল অ্যানাউন্সমেন্ট রিড করা
    const unreadGlobal = announcements.filter(a => !a.isRead);
    if (unreadGlobal.length > 0) {
      const readIds = JSON.parse(localStorage.getItem(`readAnnouncements_${user.uid}`) || "[]");
      unreadGlobal.forEach(a => { if (!readIds.includes(a.id)) readIds.push(a.id); });
      localStorage.setItem(`readAnnouncements_${user.uid}`, JSON.stringify(readIds));
      setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
      window.dispatchEvent(new Event("announcementRead"));
    }
  };

  const generateDummyNotification = async () => {
    if (!user) return;
    const types = ["info", "success", "reminder"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    let title = "";
    let message = "";

    if (randomType === "info") {
      title = "Profile Updated";
      message = "Your profile settings have been saved successfully.";
    } else if (randomType === "success") {
      title = "Milestone Reached! 🎉";
      message = "You have completed 7 days of continuous check-ins. Keep it up!";
    } else {
      title = "Daily Reminder";
      message = "Don't forget to log your mood and sleep for today.";
    }

    await addDoc(collection(db, "notifications"), {
      userId: user.uid,
      title,
      message,
      type: randomType,
      isRead: false,
      createdAt: serverTimestamp()
    });
  };

  const getIconData = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'success') return { icon: '🎉', bg: 'bg-green-100 text-green-600 border-green-200' };
    if (t === 'warning') return { icon: '⚠️', bg: 'bg-amber-100 text-amber-600 border-amber-200' };
    if (t === 'reminder') return { icon: '⏰', bg: 'bg-orange-100 text-orange-600 border-orange-200' };
    return { icon: '💡', bg: 'bg-blue-100 text-blue-600 border-blue-200' }; 
  };

  // Safe Date Formatting Helper
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    let dateObj;
    if (typeof timestamp.toDate === "function") dateObj = timestamp.toDate();
    else if (timestamp.seconds) dateObj = new Date(timestamp.seconds * 1000);
    else dateObj = new Date(timestamp);
    
    return dateObj.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (!user) return null;

  // মোট আনরিড কাউন্ট (গ্লোবাল এবং পার্সোনাল মিলিয়ে)
  const unreadCount = allMessages.filter(n => !n.isRead).length;

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl shadow-sm">
               🔔
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Notifications</h2>
          </div>
          <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">
            You have <span className="font-bold text-blue-600">{unreadCount}</span> unread messages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={generateDummyNotification}
            className="text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
          >
            + Add Test Notification
          </button>

          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition"
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[50vh]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-64 p-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4">
              📭
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-1">All caught up!</h4>
            <p className="text-slate-500 text-sm">You have no new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {allMessages.map((notif) => {
              const { icon, bg } = getIconData(notif.type);
              
              return (
                <div 
                  key={notif.id} 
                  onClick={() => markAsRead(notif.id, notif.isRead, notif.isGlobal)}
                  // আনরিড হলে ব্যাকগ্রাউন্ড নীল এবং ক্লিক্যাবল হবে
                  className={`p-4 md:p-6 flex items-start gap-4 transition-colors ${
                    !notif.isRead ? "cursor-pointer bg-blue-50/40 hover:bg-blue-50/70" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl border shadow-sm ${bg}`}>
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-base font-bold truncate ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                          {notif.title}
                        </h4>
                        {notif.isGlobal && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                            📢 Broadcast
                          </span>
                        )}
                      </div>
                      {/* আনরিড হলে নীল রঙের ডট দেখাবে */}
                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 mt-1.5 shadow-sm"></span>
                      )}
                    </div>
                    <p className={`text-sm mb-2 leading-relaxed ${notif.isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                      {notif.message || notif.content} 
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {formatTime(notif.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}