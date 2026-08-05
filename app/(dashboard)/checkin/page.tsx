"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

const MOODS = [
  { id: "Great", emoji: "😄", label: "Great", color: "hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800", active: "bg-green-100 dark:bg-green-900/40 border-green-500 text-green-700 dark:text-green-400" },
  { id: "Good", emoji: "🙂", label: "Good", color: "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800", active: "bg-blue-100 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-400" },
  { id: "Okay", emoji: "😐", label: "Okay", color: "hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-200 dark:hover:border-yellow-800", active: "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 text-yellow-700 dark:text-yellow-400" },
  { id: "Low", emoji: "😔", label: "Low", color: "hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800", active: "bg-red-100 dark:bg-red-900/40 border-red-500 text-red-700 dark:text-red-400" },
];

// হিস্ট্রির জন্য ইমোজি এবং ব্যাজ কালার জেনারেট করার হেল্পার ফাংশন
const getMoodBadge = (moodId: string) => {
  switch (moodId) {
    case "Great": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    case "Good": return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
    case "Okay": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    case "Low": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    default: return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  }
};

const getMoodEmoji = (moodId: string) => {
  const mood = MOODS.find(m => m.id === moodId);
  return mood ? mood.emoji : "😶";
};

export default function CheckInPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [mood, setMood] = useState<string>("");
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [sleepHours, setSleepHours] = useState<number | "">("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // নতুন স্টেট: হিস্ট্রি সেভ করার জন্য
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // সর্বশেষ ৫টি চেক-ইন হিস্ট্রি ফেচ করার কুয়েরি
    const q = query(
      collection(db, "checkins"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentHistory(historyData);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood || sleepHours === "") {
      setMessage({ type: "error", text: "Please select your mood and sleep hours." });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      await addDoc(collection(db, "checkins"), {
        userId: user.uid,
        mood,
        stressLevel,
        sleepHours: Number(sleepHours),
        timestamp: serverTimestamp(),
      });
      
      setMessage({ type: "success", text: "Your daily check-in has been saved successfully!" });
      
      // একটু পরে ফর্ম ক্লিয়ার করা, রিডাইরেক্ট না করে এই পেজেই রাখা হলো যাতে হিস্ট্রি দেখা যায়
      setTimeout(() => {
        setMood("");
        setStressLevel(5);
        setSleepHours("");
        setMessage({ type: "", text: "" });
        setIsSubmitting(false);
      }, 2000);
      
    } catch (error) {
      console.error("Check-in error:", error);
      setMessage({ type: "error", text: "Failed to save check-in. Please try again." });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto pb-20 transition-colors duration-200">
      
      {/* Header */}
      <header className="mb-8 text-center max-w-3xl mx-auto">
        <div className="inline-flex w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center text-blue-600 dark:text-blue-400 text-3xl shadow-sm mb-4 transition-colors">
          ✨
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">Daily Check-In</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">How is your day going? Keep track of your mental wellness.</p>
      </header>

      {message.text && (
        <div className={`max-w-3xl mx-auto p-4 rounded-xl mb-6 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
          message.type === "success" 
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50" 
            : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50"
        }`}>
          {message.type === "success" ? "✅" : "⚠️"} {message.text}
        </div>
      )}

      {/* Grid Layout for Form and History on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Section (Left Side) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Mood Selection */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">How is your mood today?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {MOODS.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                      mood === m.id ? m.active : `border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${m.color}`
                    }`}
                  >
                    <span className="text-4xl mb-3 transform transition-transform group-hover:scale-110">{m.emoji}</span>
                    <span className={`font-bold text-sm ${mood === m.id ? "" : "text-slate-600 dark:text-slate-400"}`}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Stress Level */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Stress Level</h3>
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg font-bold text-lg border border-blue-100 dark:border-blue-800/50">
                  {stressLevel} / 10
                </span>
              </div>
              
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={stressLevel} 
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
              />
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-wider">
                <span>Very Relaxed (1)</span>
                <span>Highly Stressed (10)</span>
              </div>
            </div>

            {/* 3. Sleep Hours */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">How many hours did you sleep last night?</h3>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-2xl">
                    🛌
                  </div>
                  <input 
                    type="number" 
                    min="0" 
                    max="24"
                    step="0.5"
                    placeholder="e.g., 7"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
                <span className="text-slate-500 dark:text-slate-400 font-bold text-lg">Hours</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all shadow-md flex items-center justify-center gap-2 ${
                isSubmitting ? "bg-blue-400 dark:bg-blue-500/50 cursor-not-allowed" : "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                "Save Check-In"
              )}
            </button>
          </form>
        </div>

        {/* Recent History Section (Right Side on Desktop, Bottom on Mobile) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 sticky top-24 transition-colors">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Past Check-Ins</h3>
            </div>

            {recentHistory.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                  📭
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No recent check-ins found. Complete your first check-in today!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentHistory.map((checkin) => (
                  <div key={checkin.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        {getMoodEmoji(checkin.mood)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-0.5">
                          {checkin.timestamp?.toDate ? new Date(checkin.timestamp.toDate()).toLocaleDateString('en-US', { 
                            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          }) : "Just now"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          Stress: <span className="text-slate-700 dark:text-slate-300">{checkin.stressLevel}</span> • Sleep: <span className="text-slate-700 dark:text-slate-300">{checkin.sleepHours}h</span>
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getMoodBadge(checkin.mood)}`}>
                      {checkin.mood}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {recentHistory.length > 0 && (
               <div className="mt-6 text-center">
                 <button onClick={() => router.push('/reports')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                   View Full Report →
                 </button>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}