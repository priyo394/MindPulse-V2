"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ১. ইউজারের একাউন্ট তৈরির সময় বের করা (সরাসরি Auth থেকে, যা সবচেয়ে ফাস্ট এবং রিলায়েবল)
  const userCreationTime = useMemo(() => {
    if (!user?.metadata?.creationTime) return 0;
    return new Date(user.metadata.creationTime).getTime();
  }, [user]);

  // আজকের দিন শুরু হওয়ার সময় (Midnight - 12:00 AM) বের করা
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // টাইমস্ট্যাম্প কনভার্ট করার হেল্পার ফাংশন
  const getTime = (timestamp: any) => {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    return new Date(timestamp).getTime() || 0;
  };

  useEffect(() => {
    if (!user) return;

    // ২. পার্সোনাল নোটিফিকেশন ফেচ করা
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

    // ৩. গ্লোবাল অ্যানাউন্সমেন্ট ফেচ করা (এখানে কোনো ফিল্টার হবে না, শুধু ফেচ হবে)
    const qAnnounce = query(collection(db, "announcements"));

    const unsubscribeAnnounce = onSnapshot(qAnnounce, (snapshot) => {
      const readIds = JSON.parse(localStorage.getItem(`readAnnouncements_${user.uid}`) || "[]");
      const annData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isGlobal: true, 
        isRead: readIds.includes(doc.id)
      }));
      setAnnouncements(annData);
      setIsLoading(false);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeAnnounce();
    };
  }, [user]);

  // ৪. ডেটা ফিল্টার এবং সর্ট করা
  const allMessages = useMemo(() => {
    // শুধুমাত্র গ্লোবাল অ্যানাউন্সমেন্টগুলো ফিল্টার করা
    const filteredAnnouncements = announcements.filter(ann => {
      if (!ann.createdAt) return false; // ডাটাবেজে createdAt না থাকলে হাইড করে দিবে
      const annTime = getTime(ann.createdAt);
      // একাউন্ট খোলার আগের অ্যানাউন্সমেন্ট বাদ দেওয়া হবে। (৬০ সেকেন্ডের বাফার রাখা হলো)
      return userCreationTime === 0 ? true : annTime >= (userCreationTime - 60000); 
    });

    // পার্সোনাল নোটিফিকেশন এবং ফিল্টার করা অ্যানাউন্সমেন্ট একসাথে করে সময় অনুযায়ী সাজানো
    return [...notifications, ...filteredAnnouncements].sort(
      (a, b) => getTime(b.createdAt) - getTime(a.createdAt)
    );
  }, [notifications, announcements, userCreationTime]);

  // ৫. আনরিড কাউন্ট হিসাব করা (নতুন ফিক্স: শুধুমাত্র আজকের বা তার পরের অপঠিত নোটিফিকেশনগুলো কাউন্ট হবে)
  const unreadCount = useMemo(() => {
    return allMessages.filter(n => {
      if (n.isRead) return false;
      const notifTime = getTime(n.createdAt);
      return notifTime >= todayStart;
    }).length;
  }, [allMessages, todayStart]);

  // নোটিফিকেশনে ক্লিক করলে রিড হিসেবে মার্ক হবে
  const markAsRead = async (id: string, isRead: boolean, isGlobal: boolean) => {
    if (isRead || !user) return;
    
    if (isGlobal) {
      const readIds = JSON.parse(localStorage.getItem(`readAnnouncements_${user.uid}`) || "[]");
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`readAnnouncements_${user.uid}`, JSON.stringify(readIds));
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
        window.dispatchEvent(new Event("announcementRead"));
      }
    } else {
      try {
        await updateDoc(doc(db, "notifications", id), { isRead: true });
      } catch (error) {
        console.error("Error updating notification:", error);
      }
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

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
    if (t === 'success') return { icon: '🎉', bg: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50' };
    if (t === 'warning') return { icon: '⚠️', bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' };
    if (t === 'reminder') return { icon: '⏰', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' };
    return { icon: '💡', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' }; 
  };

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

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto transition-colors duration-200">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl shadow-sm border border-blue-200 dark:border-blue-800/50">
               🔔
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base font-medium">
            You have <span className="font-bold text-blue-600 dark:text-blue-400">{unreadCount}</span> unread messages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={generateDummyNotification}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition"
          >
            + Add Test Notification
          </button>

          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-lg transition border border-blue-100 dark:border-blue-800/50"
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[50vh] transition-colors">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-64 p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mb-4">
              📭
            </div>
            <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">All caught up!</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm">You have no new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {allMessages.map((notif) => {
              const { icon, bg } = getIconData(notif.type);
              
              return (
                <div 
                  key={notif.id} 
                  onClick={() => markAsRead(notif.id, notif.isRead, notif.isGlobal)}
                  className={`p-4 md:p-6 flex items-start gap-4 transition-colors ${
                    !notif.isRead 
                      ? "cursor-pointer bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-50/70 dark:hover:bg-blue-950/50" 
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl border shadow-sm ${bg}`}>
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-base font-bold truncate ${notif.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                          {notif.title}
                        </h4>
                        {notif.isGlobal && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50 flex items-center gap-1">
                            📢 Broadcast
                          </span>
                        )}
                      </div>
                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-400 rounded-full shrink-0 mt-1.5 shadow-sm"></span>
                      )}
                    </div>
                    <p className={`text-sm mb-2 leading-relaxed ${notif.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                      {notif.message || notif.content} 
                    </p>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
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