"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";

interface ActivityLog {
  id: string;
  userName: string;
  action: string;
  details: string;
  type: "info" | "success" | "warning" | "danger";
  createdAt: any;
}

// ১. নিরাপদভাবে তারিখ পার্স করার হেল্পার ফাংশন
const parseDate = (raw: any): Date => {
  if (!raw) return new Date();
  
  // Firestore Timestamp handling
  if (typeof raw?.toDate === "function") return raw.toDate();
  if (typeof raw?.toMillis === "function") return new Date(raw.toMillis());
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  
  // Normal string or number date
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// ২. সুন্দর ও নিরাপদভাবে ডিসপ্লে করার ফরম্যাটার
const formatLogDate = (rawDate: any) => {
  const dateObj = parseDate(rawDate);
  return dateObj.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isAddingTest, setIsAddingTest] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchLogs = async () => {
    try {
      const snap = await getDocs(collection(db, "activityLogs"));
      const logsList: ActivityLog[] = [];
      
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        logsList.push({
          id: docSnap.id,
          userName: data.userName || "System",
          action: data.action || "Unknown Action",
          details: data.details || "",
          type: data.type || "info",
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      // নিরাপদ সর্টিং (নতুন থেকে পুরনো)
      logsList.sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
      setLogs(logsList);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // টেস্ট লগ যোগ করার ফাংশন
  const handleAddTestLog = async () => {
    setIsAddingTest(true);
    try {
      const newLog = {
        userName: "Admin User",
        action: "Tested System Log",
        details: "This is a manually generated test log to verify UI and functionality.",
        type: "success" as const,
        createdAt: new Date().toISOString(),
      };
      
      await addDoc(collection(db, "activityLogs"), newLog);
      await fetchLogs(); // রিফ্রেশ করে ডেটা নিয়ে আসা
      alert("Test log added successfully!");
    } catch (error) {
      console.error("Error adding test log:", error);
      alert("Failed to add test log.");
    } finally {
      setIsAddingTest(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleClearLogs = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL activity logs?")) return;

    setIsClearing(true);
    try {
      const deletePromises = logs.map((log) => deleteDoc(doc(db, "activityLogs", log.id)));
      await Promise.all(deletePromises);
      
      setLogs([]);
      alert("All activity logs have been cleared successfully.");
    } catch (error) {
      console.error("Error clearing logs:", error);
      alert("Failed to clear some logs.");
    } finally {
      setIsClearing(false);
    }
  };

  const getLogStyle = (type: string) => {
    switch (type) {
      case "success": 
        return { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/60", border: "border-emerald-200 dark:border-emerald-800", icon: "✓" };
      case "danger": 
        return { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/60", border: "border-red-200 dark:border-red-800", icon: "✗" };
      case "warning": 
        return { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/60", border: "border-amber-200 dark:border-amber-800", icon: "!" };
      default: 
        return { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/60", border: "border-blue-200 dark:border-blue-800", icon: "i" };
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6 relative transition-colors">
      
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Activity Logs 🕒</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System-wide user actions and security events log.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 w-full sm:w-44"
          />
          
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 cursor-pointer"
          >
            <option value="all">All Activities</option>
            <option value="success">Creations (Success)</option>
            <option value="warning">Updates (Warning)</option>
            <option value="danger">Deletions (Danger)</option>
            <option value="info">General (Info)</option>
          </select>

          <button 
            onClick={handleAddTestLog}
            disabled={isAddingTest}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm transition-colors text-sm whitespace-nowrap disabled:opacity-50"
          >
            {isAddingTest ? "Adding..." : "+ Add Test Log"}
          </button>

          <button 
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold rounded-lg shadow-sm transition-colors text-sm disabled:opacity-50 whitespace-nowrap"
          >
            {isClearing ? "Clearing..." : "Clear All"}
          </button>
        </div>
      </div>

      {/* Logs Timeline / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 transition-colors">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-slate-200"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
            <p>No recent activities logged. Click "+ Add Test Log" above to test the view!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              const style = getLogStyle(log.type);
              
              return (
                <div key={log.id} className="flex gap-4 items-start p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition group border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${style.bg} ${style.color} ${style.border}`}>
                    {style.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {log.userName} <span className="text-slate-500 dark:text-slate-400 font-medium mx-1">performed</span> {log.action}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {/* নিরাপদ ডেট ফরম্যাটিং */}
                        {formatLogDate(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {log.details}
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