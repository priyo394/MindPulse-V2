"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import CheckInModal from "../../components/CheckInModal";
import Link from "next/link";

const getMoodData = (mood?: string) => {
  switch (mood) {
    case "Great": return { icon: "😄", bg: "bg-green-100 text-green-700" };
    case "Good": return { icon: "🙂", bg: "bg-blue-100 text-blue-700" };
    case "Okay": return { icon: "😐", bg: "bg-yellow-100 text-yellow-700" };
    case "Low": return { icon: "😔", bg: "bg-red-100 text-red-700" };
    default: return { icon: "😶", bg: "bg-slate-100 text-slate-500" };
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  
  const [wellnessScore, setWellnessScore] = useState<number | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<any>(null);
  const [recentJournals, setRecentJournals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // ডাইনামিক ওয়েলনেস টিপসের জন্য নতুন স্টেট
  const [wellnessTips, setWellnessTips] = useState<any[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (user) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // ১. Check-in ডেটা ফেচ
      const checkInQuery = query(
        collection(db, "checkins"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const unsubscribeCheckIn = onSnapshot(checkInQuery, (snapshot) => {
        if (!snapshot.empty) {
          const latestCheckIn = { id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as any) };
          const checkInDate = latestCheckIn.timestamp?.toDate();

          if (checkInDate && checkInDate >= todayStart) {
            setTodayCheckIn(latestCheckIn);
            calculateScore(latestCheckIn);
          } else {
            setTodayCheckIn(null);
            setWellnessScore(null);
          }
        } else {
            setTodayCheckIn(null);
            setWellnessScore(null);
        }
      });

      // ২. Recent Journals ডেটা ফেচ
      const journalsQuery = query(
        collection(db, "journals"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(2)
      );

      const unsubscribeJournals = onSnapshot(journalsQuery, (snapshot) => {
        const jData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentJournals(jData);
      });

      // ৩. অ্যাডমিন প্যানেল থেকে Wellness Tips ফেচ করা (আপনার ডাটাবেস নাম যদি "wellness_tips" হয়, তবে সেটি দিন)
      const tipsQuery = query(collection(db, "wellnessTips")); 
      const unsubscribeTips = onSnapshot(tipsQuery, (snapshot) => {
        const tipsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (tipsData.length > 0) {
          setWellnessTips(tipsData);
        }
      });

      return () => {
        unsubscribeCheckIn();
        unsubscribeJournals();
        unsubscribeTips();
      };
    }
  }, [user]);

  // অটো-স্লাইডার লজিক (প্রতি ৭ সেকেন্ডে স্লাইড চেঞ্জ হবে)
  useEffect(() => {
    if (wellnessTips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % wellnessTips.length);
      }, 7000); // 7000 ms = 7 seconds
      return () => clearInterval(interval);
    }
  }, [wellnessTips]);

  const calculateScore = (checkIn: any) => {
    let score = 50;
    if (checkIn.mood === "Great") score += 25;
    else if (checkIn.mood === "Good") score += 20;
    else if (checkIn.mood === "Okay") score += 10;
    else if (checkIn.mood === "Low") score += 5;

    const stressDeduction = (checkIn.stressLevel || 5) * 2;
    score -= stressDeduction;

    const sleep = checkIn.sleepHours || 0;
    if (sleep >= 7 && sleep <= 9) score += 25;
    else if (sleep >= 5) score += 15;
    else score += 5;

    setWellnessScore(Math.min(100, Math.max(10, score)));
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 pt-4">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Today's Mood" 
          value={todayCheckIn ? todayCheckIn.mood : "No data yet"}
          subtitle={todayCheckIn ? "Updated today" : "+ Add your mood"}
          icon={getMoodData(todayCheckIn?.mood).icon} 
          iconBg={getMoodData(todayCheckIn?.mood).bg}
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
        <StatCard 
          title="Stress Level" 
          value={todayCheckIn ? `${todayCheckIn.stressLevel}/10` : "No data yet"}
          subtitle={todayCheckIn ? "Updated today" : "+ Add your stress"}
          icon="🌡️" 
          iconBg="bg-red-50 text-red-600"
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
        <StatCard 
          title="Sleep Hours" 
          value={todayCheckIn ? `${todayCheckIn.sleepHours}h` : "No data yet"}
          subtitle={todayCheckIn ? "Updated today" : "+ Add your sleep"}
          icon="🛌" 
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
        <StatCard 
          title="Wellness Score" 
          value={wellnessScore !== null ? wellnessScore.toString() : "--"}
          subtitle={todayCheckIn ? "✅ Complete check-in" : "Complete check-in"}
          icon="⭐" 
          iconBg="bg-amber-100 text-amber-600"
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-blue-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
              <h3 className="font-bold text-lg">Daily Check-In Status</h3>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {todayCheckIn ? "Check-in complete! 🎉" : "No check-in today"}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {todayCheckIn ? "Great job! You have successfully logged your wellness data today." : "Start your daily check-in to track your wellness."}
            </p>
          </div>
          <div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              {todayCheckIn ? "Update Check-In" : "Start Check-In"}
            </button>
          </div>
        </div>

        {/* Dynamic Auto-Sliding Wellness Tips */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800">Daily Wellness Tips</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2.py-0.5 rounded-md border border-green-100 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Live
              </span>
            </div>
            
            <div className="bg-green-50/50 rounded-xl p-5 border border-green-100 flex gap-4 min-h-[140px] items-center relative overflow-hidden group">
              <span className="text-green-600 text-3xl shrink-0 transition-transform duration-300 group-hover:scale-110">
                {wellnessTips.length > 0 && wellnessTips[currentTipIndex]?.icon ? wellnessTips[currentTipIndex].icon : "💡"}
              </span>
              
              <div className="flex-1">
                {wellnessTips.length > 0 ? (
                  <div key={currentTipIndex} className="animate-pulse-once">
                    <h4 className="font-bold text-slate-800 text-base mb-1.5">{wellnessTips[currentTipIndex].title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      {wellnessTips[currentTipIndex].content || wellnessTips[currentTipIndex].description}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm leading-relaxed font-medium flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Loading tips...
                  </p>
                )}
              </div>
            </div>

            {/* Slider Navigation Dots */}
            {wellnessTips.length > 1 && (
              <div className="flex justify-center gap-2 mt-5">
                {wellnessTips.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentTipIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${currentTipIndex === idx ? "w-6 bg-green-500" : "w-2 bg-green-200 hover:bg-green-300"}`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2 text-slate-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
              <h3 className="font-bold text-lg">Mood Trend</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">Last 7 Days</span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <svg className="w-12 h-12 mb-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h2v7l2-1.5 2 1.5V4h5v16z"/></svg>
            <p className="font-semibold text-slate-600 mb-1">No mood data yet</p>
            <p className="text-sm">Start checking in daily to see your mood trend.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
              <h3 className="font-bold text-lg">Weekly Overview</h3>
            </div>
            <Link href="/reports" className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:underline">
              View Report <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-lg">🙂</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Avg Mood</p>
                <p className="font-bold text-slate-800">No data</p>
              </div>
            </div>
            <div className="border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-lg">🌡️</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Avg Stress</p>
                <p className="font-bold text-slate-800">No data</p>
              </div>
            </div>
            <div className="border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-lg">🛌</div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Avg Sleep</p>
                <p className="font-bold text-slate-800">No data</p>
              </div>
            </div>
            <div className="border border-slate-100 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Check-ins</p>
                <p className="font-bold text-slate-800">0/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {/* Recent Journal Entries */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
            <h3 className="font-bold text-lg">Recent Journal Entries</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            {recentJournals.length === 0 ? (
              <>
                <p className="font-bold text-slate-800 mb-1">No journal entries yet</p>
                <p className="text-sm text-slate-500 mb-6">Start writing your thoughts and feelings.</p>
              </>
            ) : (
              <div className="w-full space-y-3 mb-6 text-left">
                {recentJournals.map(journal => (
                  <div key={journal.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                    <p className="font-semibold text-sm text-slate-800 line-clamp-1">{journal.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{journal.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            <Link 
              href="/journal"
              className="inline-flex items-center gap-2 border-2 border-blue-100 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg font-semibold text-sm transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              Write Journal
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            <h3 className="font-bold text-lg">Quick Actions</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition"
            >
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span className="font-semibold text-sm">Daily Check-In</span>
            </button>
            
            <Link href="/chat" className="flex flex-col items-center justify-center p-4 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 hover:bg-teal-100 transition">
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              <span className="font-semibold text-sm">AI Assistant</span>
            </Link>

            <Link href="/reports" className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100 transition">
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
              <span className="font-semibold text-sm">View Reports</span>
            </Link>

            <Link href="/journal" className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 transition">
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
              <span className="font-semibold text-sm">Write Journal</span>
            </Link>
          </div>
        </div>
      </div>

      <CheckInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={user.uid}
        onSuccess={() => setIsModalOpen(false)}
        existingData={todayCheckIn}
      />
      
      {/* Inline animation styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .animate-pulse-once {
          animation: pulseOnce 0.6s ease-out forwards;
        }
        @keyframes pulseOnce {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, iconBg, onClick }: { title: string, value: string, subtitle: string, icon: string, iconBg: string, onClick: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <p className="text-xs font-semibold text-slate-500">{title}</p>
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{value}</h3>
        <button 
          onClick={onClick}
          className="text-xs font-semibold text-blue-600 hover:underline text-left"
        >
          {subtitle}
        </button>
      </div>
    </div>
  );
}