"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

interface JournalReport {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export default function JournalReportsPage() {
  const [journals, setJournals] = useState<JournalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [selectedJournal, setSelectedJournal] = useState<JournalReport | null>(null);

  useEffect(() => {
    const fetchJournals = async () => {
      try {
        // ১. প্রথমে ইউজারদের ডেটা আনা হলো
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap: Record<string, { name: string; email: string }> = {};
        usersSnap.forEach((doc) => {
          const data = doc.data();
          usersMap[doc.id] = {
            name: data.name || "Unknown User",
            email: data.email || "No Email",
          };
        });

        // ২. জার্নাল ডেটা আনা হলো
        const journalsSnap = await getDocs(collection(db, "journals"));
        const journalsList: JournalReport[] = [];
        
        journalsSnap.forEach((doc) => {
          const data = doc.data();
          
          // শুধুমাত্র ভ্যালিড ইউজারদের ডেটা লিস্টে অ্যাড হবে
          if (data.userId && usersMap[data.userId]) {
            journalsList.push({
              id: doc.id,
              userId: data.userId,
              title: data.title || "Untitled Entry",
              content: data.content || data.text || "No content available.",
              createdAt: data.createdAt || new Date().toISOString(),
              userName: usersMap[data.userId].name,
              userEmail: usersMap[data.userId].email,
            });
          }
        });

        // নতুন লেখাগুলো উপরে দেখানোর জন্য সর্ট করা
        journalsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setJournals(journalsList);
      } catch (error) {
        console.error("Error fetching journals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJournals();
  }, []);

  // Search Logic
  const filteredJournals = journals.filter((journal) => {
    return (
      journal.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      journal.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journal.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Delete Journal Logic
  const deleteJournal = async (journalId: string) => {
    if (!window.confirm("Are you sure you want to delete this journal entry permanently?")) return;

    setActionLoadingId(journalId);
    try {
      await deleteDoc(doc(db, "journals", journalId));
      setJournals((prev) => prev.filter((j) => j.id !== journalId));
      alert("Journal deleted successfully!");
      if (selectedJournal?.id === journalId) setSelectedJournal(null);
    } catch (error) {
      console.error("Error deleting journal:", error);
      alert("Failed to delete journal.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-4 md:p-6 space-y-6 relative">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Journal Reports 📖</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review user journal entries for insights or moderation.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full md:w-72">
          <input 
            type="text" 
            placeholder="Search by user or title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
      </div>

      {/* Journals Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-4 pl-2">Author</th>
                <th className="pb-4">Date & Time</th>
                <th className="pb-4">Journal Snippet</th>
                <th className="pb-4 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      Loading journal entries...
                    </div>
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No journal entries found.
                  </td>
                </tr>
              ) : (
                filteredJournals.map((journal) => (
                  <tr key={journal.id} className="hover:bg-slate-50/80 transition group">
                    
                    {/* Author Info */}
                    <td className="py-4 pl-2">
                      <div>
                        <p className="font-bold text-slate-800">{journal.userName}</p>
                        <p className="text-xs text-slate-500">{journal.userEmail}</p>
                      </div>
                    </td>

                    {/* Date Info */}
                    <td className="py-4 text-slate-600 font-medium text-xs">
                      {new Date(journal.createdAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {new Date(journal.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Content Snippet */}
                    <td className="py-4 pr-4">
                      <div className="max-w-xs md:max-w-md">
                        <p className="font-semibold text-slate-700 truncate">{journal.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {journal.content.length > 60 ? journal.content.substring(0, 60) + "..." : journal.content}
                        </p>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 text-right pr-2">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedJournal(journal)}
                          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                        >
                          Read
                        </button>
                        <button 
                          onClick={() => deleteJournal(journal.id)}
                          disabled={actionLoadingId === journal.id}
                          className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100 disabled:opacity-50"
                        >
                          {actionLoadingId === journal.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                    
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read Full Journal Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl relative border border-slate-200 max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedJournal.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Written by <span className="font-bold text-slate-700">{selectedJournal.userName}</span> on {new Date(selectedJournal.createdAt).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedJournal(null)} 
                className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-full"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                {selectedJournal.content}
              </p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
               <button 
                  onClick={() => deleteJournal(selectedJournal.id)}
                  disabled={actionLoadingId === selectedJournal.id}
                  className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                >
                  Delete Entry
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}