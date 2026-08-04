"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

interface WellnessTip {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function WellnessTipsPage() {
  const [tips, setTips] = useState<WellnessTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const fetchTips = async () => {
    try {
      const tipsSnap = await getDocs(collection(db, "wellnessTips"));
      const tipsList: WellnessTip[] = [];
      
      tipsSnap.forEach((doc) => {
        const data = doc.data();
        tipsList.push({
          id: doc.id,
          title: data.title || "No Title",
          content: data.content || "No Content",
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      tipsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTips(tipsList);
    } catch (error) {
      console.error("Error fetching tips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  const handleAddTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return alert("Please fill in all fields.");

    setIsSubmitting(true);
    try {
      const newTipData = {
        title: newTitle,
        content: newContent,
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, "wellnessTips"), newTipData);
      
      // ✅ Activity Log এ সেভ করা হচ্ছে
      await addDoc(collection(db, "activityLogs"), {
        userName: "Admin User",
        action: "Created Wellness Tip",
        details: `Added a new tip titled: "${newTitle}"`,
        type: "success",
        createdAt: new Date().toISOString(),
      });
      
      setTips([{ id: docRef.id, ...newTipData }, ...tips]);
      setNewTitle("");
      setNewContent("");
      setIsModalOpen(false);
      alert("New wellness tip added successfully!");
    } catch (error) {
      console.error("Error adding tip:", error);
      alert("Failed to add tip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTip = async (tipId: string) => {
    if (!window.confirm("Are you sure you want to delete this tip? It will be removed from user dashboards.")) return;

    setActionLoadingId(tipId);
    try {
      await deleteDoc(doc(db, "wellnessTips", tipId));
      
      // ✅ Activity Log এ সেভ করা হচ্ছে
      await addDoc(collection(db, "activityLogs"), {
        userName: "Admin User",
        action: "Deleted Wellness Tip",
        details: `Removed a wellness tip from the system.`,
        type: "danger",
        createdAt: new Date().toISOString(),
      });

      setTips((prev) => prev.filter((t) => t.id !== tipId));
    } catch (error) {
      console.error("Error deleting tip:", error);
      alert("Failed to delete tip.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-4 md:p-6 space-y-6 relative">
      
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Wellness Tips Management ⭐</h2>
          <p className="text-sm text-slate-500 mt-1">
            Add or remove daily wellness advice for users.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
          Add New Tip
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : tips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 font-medium shadow-sm">
          No wellness tips added yet. Click "+ Add New Tip" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tips.map((tip) => (
            <div key={tip.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{tip.title}</h3>
                <button 
                  onClick={() => handleDeleteTip(tip.id)}
                  disabled={actionLoadingId === tip.id}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Delete Tip"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4 flex-1 whitespace-pre-wrap line-clamp-4">
                {tip.content}
              </p>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-auto pt-3 border-t border-slate-50">
                Added on: {new Date(tip.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl relative overflow-hidden">
            
            <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-emerald-800">Create New Wellness Tip</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-emerald-600 hover:bg-emerald-200 bg-emerald-100 p-1.5 rounded-full transition"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleAddTip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tip Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Stay Hydrated"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Content / Advice <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Write the tip description here..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none custom-scrollbar"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    "Publish Tip"
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