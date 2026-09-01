"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { collection, getDocs } from "firebase/firestore";

interface CheckInReport {
  id: string;
  userId: string;
  mood: string;
  sleepHours: string | number;
  note: string;
  createdAt: string | null; // 🟢 null হ্যান্ডেল করার জন্য টাইপ আপডেট
  userName?: string;
  userEmail?: string;
}

export default function CheckInReportsPage() {
  const [reports, setReports] = useState<CheckInReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState("all");
  
  const [selectedReport, setSelectedReport] = useState<CheckInReport | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap: Record<string, { name: string; email: string }> = {};
        usersSnap.forEach((doc) => {
          const data = doc.data();
          usersMap[doc.id] = {
            name: data.name || "Unknown User",
            email: data.email || "No Email",
          };
        });

        const checkinsSnap = await getDocs(collection(db, "checkins"));
        const reportsList: CheckInReport[] = [];
        
        checkinsSnap.forEach((doc) => {
          const data = doc.data();
          
          if (data.userId && usersMap[data.userId]) {
            // 🟢 বিভিন্ন নামে সেভ থাকা টাইমস্ট্যাম্প এবং টাইপ Safely পার্স করার লজিক
            const rawDate = data.createdAt || data.timestamp || data.date || data.created_at;
            let formattedCreatedAt: string | null = null;

            if (rawDate) {
              if (typeof rawDate.toDate === "function") {
                // Firestore Timestamp Object
                formattedCreatedAt = rawDate.toDate().toISOString();
              } else if (rawDate?.seconds) {
                // Firestore Raw Seconds Object
                formattedCreatedAt = new Date(rawDate.seconds * 1000).toISOString();
              } else {
                // ISO String / Number Timestamp / Date Object
                const parsedDate = new Date(rawDate);
                if (!isNaN(parsedDate.getTime())) {
                  formattedCreatedAt = parsedDate.toISOString();
                }
              }
            }

            reportsList.push({
              id: doc.id,
              userId: data.userId,
              mood: data.mood || "Neutral",
              sleepHours: data.sleepHours || "N/A",
              note: data.note || "",
              createdAt: formattedCreatedAt, // ❌ new Date() উঠে গেছে, ফলে কারেন্ট টাইম অটো বসবে না
              userName: usersMap[data.userId].name,
              userEmail: usersMap[data.userId].email,
            });
          }
        });

        // 🟢 তারিখ অনুযায়ী সর্টিং (যেগুলোর তারিখ নেই সেগুলো নিচে যাবে)
        reportsList.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setReports(reportsList);
      } catch (error) {
        console.error("Error fetching check-ins:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      report.userEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMood = moodFilter === "all" || report.mood.toLowerCase() === moodFilter.toLowerCase();
    
    return matchesSearch && matchesMood;
  });

  const getMoodIcon = (mood: string) => {
    const m = mood.toLowerCase();
    if (m.includes("happy") || m.includes("great") || m.includes("good")) return "😄";
    if (m.includes("sad") || m.includes("down") || m.includes("low")) return "😔";
    if (m.includes("stress") || m.includes("anxious")) return "😫";
    if (m.includes("angry")) return "😡";
    if (m.includes("okay")) return "🙂";
    return "😐"; 
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6 relative transition-colors">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Check-in Reports 📋</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor daily mood logs and sleep tracker details submitted by valid users.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search user..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
          />
          <select 
            value={moodFilter}
            onChange={(e) => setMoodFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Moods</option>
            <option value="happy">Happy / Great / Good</option>
            <option value="sad">Sad / Low</option>
            <option value="stressed">Stressed</option>
            <option value="okay">Okay / Neutral</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="pb-4 pl-2">User</th>
                <th className="pb-4">Date & Time</th>
                <th className="pb-4">Mood</th>
                <th className="pb-4">Sleep</th>
                <th className="pb-4 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-2"></div>
                      Loading valid reports...
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    No valid check-in logs found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group">
                    
                    <td className="py-4 pl-2">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{report.userName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{report.userEmail}</p>
                      </div>
                    </td>

                    {/* 🟢 dynamic date and time render */}
                    <td className="py-4 text-slate-600 dark:text-slate-300 font-medium text-xs">
                      {report.createdAt ? (
                        <>
                          {new Date(report.createdAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {new Date(report.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No date recorded</span>
                      )}
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getMoodIcon(report.mood)}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{report.mood}</span>
                      </div>
                    </td>

                    <td className="py-4">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 rounded-md text-xs font-bold">
                        {report.sleepHours} {typeof report.sleepHours === 'number' || !isNaN(Number(report.sleepHours)) ? 'hrs' : ''}
                      </span>
                    </td>

                    <td className="py-4 text-right pr-2">
                      <button 
                        onClick={() => setSelectedReport(report)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/50"
                      >
                        View Full
                      </button>
                    </td>
                    
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative border border-slate-200 dark:border-slate-800 transition-colors">
            <button 
              onClick={() => setSelectedReport(null)} 
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full transition"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1 border-b border-slate-100 dark:border-slate-800 pb-3">Check-in Details</h3>
            
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Submitted By</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedReport.userName}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Date & Time</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                  {selectedReport.createdAt ? (
                    new Date(selectedReport.createdAt).toLocaleString("en-US", { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                  ) : (
                    "No Date Recorded"
                  )}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center">
                  <span className="text-3xl block mb-1">{getMoodIcon(selectedReport.mood)}</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Mood</span>
                  <p className="font-bold text-slate-800 dark:text-slate-100 capitalize text-lg">{selectedReport.mood}</p>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center">
                  <span className="text-3xl block mb-1 text-indigo-400 dark:text-indigo-400">🌙</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Sleep</span>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{selectedReport.sleepHours}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-2">Personal Note</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.note ? selectedReport.note : <span className="text-slate-400 dark:text-slate-500 italic">No notes provided for this check-in.</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}