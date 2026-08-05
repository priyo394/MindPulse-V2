"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<"info" | "warning" | "success">("info");

  const fetchAnnouncements = async () => {
    try {
      const snap = await getDocs(collection(db, "announcements"));
      const list: Announcement[] = [];
      
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || "No Title",
          message: data.message || "No Message",
          type: data.type || "info",
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnnouncements(list);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return alert("Please fill in all fields.");

    setIsSubmitting(true);
    try {
      const newAnnouncement = {
        title: newTitle,
        message: newMessage,
        type: newType,
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, "announcements"), newAnnouncement);
      
      await addDoc(collection(db, "activityLogs"), {
        userName: "Admin User",
        action: "Broadcasted Announcement",
        details: `Sent an announcement titled: "${newTitle}"`,
        type: "success",
        createdAt: new Date().toISOString(),
      });
      
      setAnnouncements([{ id: docRef.id, ...newAnnouncement }, ...announcements]);
      setNewTitle("");
      setNewMessage("");
      setNewType("info");
      setIsModalOpen(false);
      alert("Announcement broadcasted successfully!");
    } catch (error) {
      console.error("Error adding announcement:", error);
      alert("Failed to broadcast announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement? It will be removed from all user dashboards.")) return;

    setActionLoadingId(id);
    try {
      await deleteDoc(doc(db, "announcements", id));
      
      await addDoc(collection(db, "activityLogs"), {
        userName: "Admin User",
        action: "Deleted Announcement",
        details: `Removed a broadcasted announcement from the system.`,
        type: "danger",
        createdAt: new Date().toISOString(),
      });

      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Failed to delete announcement.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "warning": return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "success": return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      default: return "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6 relative transition-colors">
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Announcements 📢</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Broadcast notifications and notices to all users.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
        >
          Create Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500 font-medium shadow-sm transition-colors">
          No active announcements. Click "Create Announcement" to broadcast one.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:shadow-md transition transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{announcement.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getTypeStyles(announcement.type)}`}>
                    {announcement.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{announcement.message}</p>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Broadcasted: {new Date(announcement.createdAt).toLocaleString()}
                </div>
              </div>
              
              <button 
                onClick={() => handleDelete(announcement.id)}
                disabled={actionLoadingId === announcement.id}
                className="px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-100 dark:border-red-900/50 whitespace-nowrap"
              >
                {actionLoadingId === announcement.id ? "Deleting..." : "Delete Notice"}
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden transition-colors">
            
            <div className="bg-blue-50 dark:bg-blue-950/40 px-6 py-4 border-b border-blue-100 dark:border-blue-900/50 flex justify-between items-center transition-colors">
              <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">New Broadcast Announcement</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 bg-blue-100 dark:bg-blue-950/80 p-1.5 rounded-full transition"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Announcement Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Scheduled Maintenance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notice Type</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                >
                  <option value="info">General Info (Blue)</option>
                  <option value="success">Good News / Update (Green)</option>
                  <option value="warning">Warning / Alert (Yellow)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Details <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Write the full announcement message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none custom-scrollbar"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Broadcasting...
                    </>
                  ) : (
                    "Broadcast Now"
                  )}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </div>
  );
}