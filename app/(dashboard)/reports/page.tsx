"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ReportsPage() {
  const { user } = useAuth();
  
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Averages state
  const [avgSleep, setAvgSleep] = useState(0);
  const [avgStress, setAvgStress] = useState(0);
  const [mostFrequentMood, setMostFrequentMood] = useState("No Data");

  useEffect(() => {
    if (!user) return;

    const fetchCheckins = async () => {
      try {
        const q = query(
          collection(db, "checkins"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCheckins(fetchedData);
        calculateMetrics(fetchedData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckins();
  }, [user]);

  const calculateMetrics = (data: any[]) => {
    if (data.length === 0) return;

    let totalSleep = 0;
    let totalStress = 0;
    const moodCounts: Record<string, number> = {};

    data.forEach(item => {
      totalSleep += Number(item.sleepHours) || 0;
      totalStress += Number(item.stressLevel) || 0;
      
      const mood = item.mood;
      if (mood) {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
    });

    setAvgSleep(totalSleep / data.length);
    setAvgStress(totalStress / data.length);

    // Find most frequent mood
    let maxCount = 0;
    let frequentMood = "No Data";
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        frequentMood = mood;
      }
    }
    setMostFrequentMood(frequentMood);
  };

  if (!user) return null;

  // Get last 7 days data for the charts (reverse to show oldest to newest left to right)
  const last7Days = [...checkins].slice(0, 7).reverse();

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl shadow-sm">
             📊
           </div>
           <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Analytics & Reports</h2>
        </div>
        <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">Track your mental wellness progress over time.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : checkins.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-[50vh]">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-300" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
          </div>
          <h4 className="text-lg font-bold text-slate-700 mb-2">Not enough data</h4>
          <p className="text-slate-500 text-sm max-w-sm">
            You haven't completed any daily check-ins yet. Start checking in to see your personalized analytics!
          </p>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard 
              title="Total Check-ins" 
              value={checkins.length.toString()} 
              subtitle="All time"
              icon="📝" 
              color="blue"
            />
            <MetricCard 
              title="Avg. Sleep" 
              value={`${avgSleep.toFixed(1)}h`} 
              subtitle="Per night"
              icon="🛌" 
              color="indigo"
            />
            <MetricCard 
              title="Avg. Stress" 
              value={`${avgStress.toFixed(1)}/10`} 
              subtitle="Overall level"
              icon="🌡️" 
              color="red"
            />
            <MetricCard 
              title="Overall Mood" 
              value={mostFrequentMood} 
              subtitle="Most frequent"
              icon="🙂" 
              color="green"
            />
          </div>

          {/* Charts Section (Tailwind CSS Based) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Stress Trend Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Stress Level Trend</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Last 7 Check-ins</p>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
                </div>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-2 mt-4 pt-4 border-b border-slate-100 pb-2">
                {last7Days.map((checkin, index) => {
                  const stress = Number(checkin.stressLevel) || 0;
                  const height = `${(stress / 10) * 100}%`;
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 group">
                      <div className="relative w-full flex justify-center h-full items-end">
                        <div 
                          className="w-full max-w-[40px] bg-red-100 group-hover:bg-red-400 rounded-t-md transition-all duration-300 relative"
                          style={{ height: height === "0%" ? "5%" : height }}
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {stress}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mt-2 truncate w-full text-center">
                        {checkin.timestamp?.toDate ? new Date(checkin.timestamp.toDate()).toLocaleDateString('en-US', { weekday: 'short' }) : "Day"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sleep Trend Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Sleep Duration Trend</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Last 7 Check-ins (Hours)</p>
                </div>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                </div>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-2 mt-4 pt-4 border-b border-slate-100 pb-2">
                {last7Days.map((checkin, index) => {
                  const sleep = Number(checkin.sleepHours) || 0;
                  // Max sleep cap at 12 hours for chart scaling
                  const height = `${Math.min((sleep / 12) * 100, 100)}%`; 
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 group">
                      <div className="relative w-full flex justify-center h-full items-end">
                        <div 
                          className="w-full max-w-[40px] bg-indigo-100 group-hover:bg-indigo-400 rounded-t-md transition-all duration-300 relative"
                          style={{ height: height === "0%" ? "5%" : height }}
                        >
                           <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {sleep}h
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mt-2 truncate w-full text-center">
                        {checkin.timestamp?.toDate ? new Date(checkin.timestamp.toDate()).toLocaleDateString('en-US', { weekday: 'short' }) : "Day"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* History Log */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="font-bold text-slate-800 text-lg">Check-in History Log</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                     <th className="p-4 font-bold">Date</th>
                     <th className="p-4 font-bold">Mood</th>
                     <th className="p-4 font-bold">Stress (1-10)</th>
                     <th className="p-4 font-bold">Sleep (Hours)</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm divide-y divide-slate-100">
                   {checkins.map((checkin, idx) => (
                     <tr key={checkin.id || idx} className="hover:bg-slate-50/50 transition">
                       <td className="p-4 text-slate-800 font-medium">
                         {checkin.timestamp?.toDate ? new Date(checkin.timestamp.toDate()).toLocaleDateString('en-US', { 
                           month: 'short', day: 'numeric', year: 'numeric' 
                         }) : "Unknown Date"}
                       </td>
                       <td className="p-4">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                           checkin.mood === 'Great' ? 'bg-green-100 text-green-700' :
                           checkin.mood === 'Good' ? 'bg-blue-100 text-blue-700' :
                           checkin.mood === 'Okay' ? 'bg-yellow-100 text-yellow-700' :
                           'bg-red-100 text-red-700'
                         }`}>
                           {checkin.mood || "N/A"}
                         </span>
                       </td>
                       <td className="p-4 text-slate-600 font-semibold">{checkin.stressLevel || "0"}</td>
                       <td className="p-4 text-slate-600 font-semibold">{checkin.sleepHours || "0"} hrs</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

// Reusable Component for Top Metric Cards
function MetricCard({ title, value, subtitle, icon, color }: { title: string, value: string, subtitle: string, icon: string, color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    red: "bg-red-50 text-red-600 border-red-100",
    green: "bg-green-50 text-green-600 border-green-100",
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${colorMap[color] || colorMap.blue}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 leading-none mb-1">{value}</h3>
        <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}