"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import CheckInModal from "../../components/CheckInModal";
import Link from "next/link";

interface CheckIn {
  id: string;
  mood?: string;
  stressLevel?: number | string;
  sleepHours?: number | string;
  timestamp?: any;
}

interface Journal {
  id: string;
  title?: string;
  content?: string;
}

interface WellnessTip {
  id: string;
  title?: string;
  content?: string;
  description?: string;
  icon?: string;
  targetMood?: string;
  targetStress?: string;
  targetSleep?: string;
}

const getMoodData = (mood?: string) => {
  switch (mood) {
    case "Great": return { icon: "😄", bg: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" };
    case "Good": return { icon: "🙂", bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" };
    case "Okay": return { icon: "😐", bg: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" };
    case "Low": return { icon: "😔", bg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" };
    default: return { icon: "😶", bg: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" };
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  
  const [wellnessScore, setWellnessScore] = useState<number | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [weeklyCheckIns, setWeeklyCheckIns] = useState<CheckIn[]>([]);
  const [recentJournals, setRecentJournals] = useState<Journal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // ডাইনামিক ওয়েলনেস টিপসের স্টেট
  const [wellnessTips, setWellnessTips] = useState<WellnessTip[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (user) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // ১. আজকের Check-in ডেটা ফেচ
      const checkInQuery = query(
        collection(db, "checkins"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      const unsubscribeCheckIn = onSnapshot(checkInQuery, (snapshot) => {
        if (!snapshot.empty) {
          const latestCheckIn = { id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as any) };
          const checkInDate = latestCheckIn.timestamp?.toDate ? latestCheckIn.timestamp.toDate() : new Date(latestCheckIn.timestamp);

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

      // ২. গত ৭ দিনের Check-ins ফেচ
      const weeklyQuery = query(
        collection(db, "checkins"),
        where("userId", "==", user.uid)
      );

      const unsubscribeWeekly = onSnapshot(weeklyQuery, (snapshot) => {
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        const filtered = docs.filter(item => {
          if (!item.timestamp) return false;
          const d = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
          return d >= sevenDaysAgo;
        });

        setWeeklyCheckIns(filtered);
      });

      // ৩. Recent Journals ডেটা ফেচ
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

      // ৪. Wellness Tips ফেচ করা
      const tipsQuery = query(collection(db, "wellnessTips"));
      const unsubscribeTips = onSnapshot(tipsQuery, (snapshot) => {
        const tipsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (tipsData.length > 0) {
          setWellnessTips(tipsData);
        }
      });

      return () => {
        unsubscribeCheckIn();
        unsubscribeWeekly();
        unsubscribeJournals();
        unsubscribeTips();
      };
    }
  }, [user]);

  // 🎯 ইউজারের আজকের কন্ডিশনের উপর ভিত্তি করে টিপস ফিল্টার করা
  const relevantTips = useMemo(() => {
    if (wellnessTips.length === 0) return [];
    
    // ইউজার যদি আজ চেক-ইন না করে থাকে, তবে সাধারণ (All) টিপস দেখাবে
    if (!todayCheckIn) {
      const generalTips = wellnessTips.filter(t => 
        t.targetMood === "All" && t.targetStress === "all" && t.targetSleep === "all"
      );
      return generalTips.length > 0 ? generalTips : wellnessTips;
    }

    const mood = todayCheckIn.mood; 
    const stress = Number(todayCheckIn.stressLevel || 5); 
    const sleep = Number(todayCheckIn.sleepHours || 7);

    // স্ট্রেস লেভেল কনভার্ট করা
    let stressCat = "medium";
    if (stress <= 3) stressCat = "low";
    else if (stress >= 7) stressCat = "high";

    // স্লিপ আওয়ার কনভার্ট করা
    let sleepCat = "optimal";
    if (sleep < 6) sleepCat = "low";
    else if (sleep > 8) sleepCat = "high";

    // ফিল্টারিং লজিক
    const filtered = wellnessTips.filter(tip => {
      const moodMatch = tip.targetMood === "All" || tip.targetMood === mood;
      const stressMatch = tip.targetStress === "all" || tip.targetStress === stressCat;
      const sleepMatch = tip.targetSleep === "all" || tip.targetSleep === sleepCat;
      
      return moodMatch && stressMatch && sleepMatch;
    });

    if (filtered.length > 0) return filtered;
    
    const fallbackTips = wellnessTips.filter(t => 
      t.targetMood === "All" && t.targetStress === "all" && t.targetSleep === "all"
    );
    
    return fallbackTips.length > 0 ? fallbackTips : wellnessTips;
  }, [wellnessTips, todayCheckIn]);

  // অটো-স্লাইডার লজিক
  useEffect(() => {
    setCurrentTipIndex(0); 
    if (relevantTips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % relevantTips.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [relevantTips]);

  // Weekly Overview হিসাব করার লজিক
  const weeklyStats = useMemo(() => {
    if (weeklyCheckIns.length === 0) {
      return {
        avgMood: "No data",
        avgMoodIcon: "🙂",
        avgStress: "No data",
        avgSleep: "No data",
        count: "0/7"
      };
    }

    const moodScores: Record<string, number> = { Great: 4, Good: 3, Okay: 2, Low: 1 };
    let totalMoodScore = 0;
    let totalStress = 0;
    let totalSleep = 0;

    weeklyCheckIns.forEach(c => {
      totalMoodScore += moodScores[c.mood || ""] || 2;
      totalStress += Number(c.stressLevel) || 0;
      totalSleep += Number(c.sleepHours) || 0;
    });

    const avgMoodScore = Math.round(totalMoodScore / weeklyCheckIns.length);
    let avgMoodText = "Okay";
    let avgMoodIcon = "😐";

    if (avgMoodScore >= 4) { avgMoodText = "Great"; avgMoodIcon = "😄"; }
    else if (avgMoodScore === 3) { avgMoodText = "Good"; avgMoodIcon = "🙂"; }
    else if (avgMoodScore === 2) { avgMoodText = "Okay"; avgMoodIcon = "😐"; }
    else { avgMoodText = "Low"; avgMoodIcon = "😔"; }

    const avgStressVal = (totalStress / weeklyCheckIns.length).toFixed(1);
    const avgSleepVal = (totalSleep / weeklyCheckIns.length).toFixed(1);

    const uniqueDays = new Set(
      weeklyCheckIns.map(c => {
        const d = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
        return d.toDateString();
      })
    );

    return {
      avgMood: avgMoodText,
      avgMoodIcon,
      avgStress: `${avgStressVal}/10`,
      avgSleep: `${avgSleepVal}h`,
      count: `${Math.min(uniqueDays.size, 7)}/7`
    };
  }, [weeklyCheckIns]);

  // Mood Trend
  const last7DaysData = useMemo(() => {
    const days = [];
    const moodHeights: Record<string, number> = { Great: 100, Good: 75, Okay: 50, Low: 25 };

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toDateString();

      const checkIn = weeklyCheckIns.find(c => {
        const cd = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
        return cd.toDateString() === dateStr;
      });

      days.push({
        day: dayStr,
        mood: checkIn ? checkIn.mood : null,
        height: checkIn && checkIn.mood ? (moodHeights[checkIn.mood] || 40) : 0,
        icon: checkIn ? getMoodData(checkIn.mood).icon : ""
      });
    }
    return days;
  }, [weeklyCheckIns]);

  const calculateScore = (checkIn: CheckIn) => {
    let score = 50;
    if (checkIn.mood === "Great") score += 25;
    else if (checkIn.mood === "Good") score += 20;
    else if (checkIn.mood === "Okay") score += 10;
    else if (checkIn.mood === "Low") score += 5;

    const stressDeduction = (Number(checkIn.stressLevel) || 5) * 2;
    score -= stressDeduction;

    const sleep = Number(checkIn.sleepHours) || 0;
    if (sleep >= 7 && sleep <= 9) score += 25;
    else if (sleep >= 5) score += 15;
    else score += 5;

    setWellnessScore(Math.min(100, Math.max(10, score)));
  };

  if (!user) return null;

  const currentTip = relevantTips[currentTipIndex];

  return (
    <div className="p-4 md:p-8 pt-4 transition-colors duration-200">
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Mood"
          value={todayCheckIn ? todayCheckIn.mood || "No data" : "No data yet"}
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
          iconBg="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
        <StatCard
          title="Sleep Hours"
          value={todayCheckIn ? `${todayCheckIn.sleepHours}h` : "No data yet"}
          subtitle={todayCheckIn ? "Updated today" : "+ Add your sleep"}
          icon="🛌"
          iconBg="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
        <StatCard
          title="Wellness Score"
          value={wellnessScore !== null ? wellnessScore.toString() : "--"}
          subtitle={todayCheckIn ? "✅ Complete check-in" : "Complete check-in"}
          icon="⭐"
          iconBg="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
          onClick={() => !todayCheckIn && setIsModalOpen(true)}
        />
      </div>

      {/* Row 2: Status & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Daily Check-In Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
            <h3 className="font-bold text-lg">Daily Check-In Status</h3>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {todayCheckIn ? "Check-in complete! 🎉" : "No check-in today"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {todayCheckIn
              ? "Great job! You have successfully logged your wellness data today."
              : "Start your daily check-in to track your wellness."}
          </p>
        </div>

        {/* Dynamic Auto-Sliding Wellness Tips */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Personalized Tips</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-md border border-green-100 dark:border-green-800/50 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></span> Live
              </span>
            </div>
            
            <div className="bg-green-50/50 dark:bg-green-900/10 rounded-xl p-5 border border-green-100 dark:border-green-900/30 flex gap-4 min-h-[140px] items-center relative overflow-hidden group">
              <span className="text-green-600 dark:text-green-400 text-3xl shrink-0 transition-transform duration-300 group-hover:scale-110">
                {currentTip?.icon || "💡"}
              </span>
              
              <div className="flex-1">
                {relevantTips.length > 0 && currentTip ? (
                  <div key={currentTipIndex} className="animate-pulse-once">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1.5">
                      {currentTip.title}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                      {currentTip.content || currentTip.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Loading tips...
                  </p>
                )}
              </div>
            </div>

            {/* Slider Navigation Dots */}
            {relevantTips.length > 1 && (
              <div className="flex justify-center gap-2 mt-5">
                {relevantTips.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTipIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${currentTipIndex === idx ? "w-6 bg-green-500 dark:bg-green-400" : "w-2 bg-green-200 dark:bg-green-900/50 hover:bg-green-300 dark:hover:bg-green-800/80"}`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Mood Trend & Weekly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Mood Trend Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
              <h3 className="font-bold text-lg">Mood Trend</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">Last 7 Days</span>
          </div>

          {weeklyCheckIns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500">
              <svg className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h2v7l2-1.5 2 1.5V4h5v16z"/></svg>
              <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">No mood data yet</p>
              <p className="text-sm">Start checking in daily to see your mood trend.</p>
            </div>
          ) : (
            <div className="flex items-end justify-between h-36 pt-4 px-2">
              {last7DaysData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                  <div className="h-24 w-full flex items-end justify-center">
                    {item.mood ? (
                      <div
                        style={{ height: `${item.height}%` }}
                        className="w-7 max-w-[28px] bg-blue-500/80 dark:bg-blue-600/80 hover:bg-blue-600 dark:hover:bg-blue-500 rounded-t-lg transition-all flex items-center justify-center text-xs relative shadow-sm"
                      >
                        <span className="text-sm absolute -top-6">{item.icon}</span>
                      </div>
                    ) : (
                      <div className="w-7 max-w-[28px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Overview */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
              <h3 className="font-bold text-lg">Weekly Overview</h3>
            </div>
            <Link href="/reports" className="text-sm text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline">
              View Report <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-lg">{weeklyStats.avgMoodIcon}</div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Mood</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{weeklyStats.avgMood}</p>
              </div>
            </div>
            <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-lg">🌡️</div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Stress</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{weeklyStats.avgStress}</p>
              </div>
            </div>
            <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-lg">🛌</div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Sleep</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{weeklyStats.avgSleep}</p>
              </div>
            </div>
            <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Check-ins</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{weeklyStats.count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Journals & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100">
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>
            <h3 className="font-bold text-lg">Recent Journal Entries</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            {recentJournals.length === 0 ? (
              <>
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">No journal entries yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start writing your thoughts and feelings.</p>
              </>
            ) : (
              <div className="w-full space-y-3 mb-6 text-left">
                {recentJournals.map(journal => (
                  <div key={journal.id} className="p-3 border border-slate-100 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{journal.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{journal.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 border-2 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-6 py-2 rounded-lg font-semibold text-sm transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              Write Journal
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100">
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            <h3 className="font-bold text-lg">Quick Actions</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
            >
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span className="font-semibold text-sm">Daily Check-In</span>
            </button>
            
            <Link href="/chat" className="flex flex-col items-center justify-center p-4 rounded-xl bg-teal-50 dark:bg-teal-900/10 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition">
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              <span className="font-semibold text-sm">AI Assistant</span>
            </Link>

            <Link href="/reports" className="flex flex-col items-center justify-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition">
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
              <span className="font-semibold text-sm">View Reports</span>
            </Link>

            <Link href="/journal" className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/30 transition">
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{value}</h3>
        <button
          onClick={onClick}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
        >
          {subtitle}
        </button>
      </div>
    </div>
  );
}