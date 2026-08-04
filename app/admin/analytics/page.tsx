"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; // পাথটি আপনার ফোল্ডার অনুযায়ী ঠিক করে নিবেন
import { collection, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// Pie Chart এর জন্য কিছু সুন্দর কালার প্যালেট
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [checkinData, setCheckinData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // ১. User Growth ডেটা ফেচ করা
        const usersSnap = await getDocs(collection(db, "users"));
        const userDatesMap: { [key: string]: number } = {};

        usersSnap.forEach((doc) => {
          const data = doc.data();
          if (data.createdAt && data.createdAt !== "N/A") {
            // ডেট ফরম্যাট করা (যেমন: Aug 4)
            const dateObj = new Date(data.createdAt);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            userDatesMap[formattedDate] = (userDatesMap[formattedDate] || 0) + 1;
          }
        });

        // চার্টের জন্য ডেটা অ্যারে তৈরি করা
        const formattedGrowthData = Object.keys(userDatesMap).map(date => ({
          name: date,
          Users: userDatesMap[date]
        }));
        setGrowthData(formattedGrowthData);

        // ২. Check-in Distribution ডেটা ফেচ করা
        const checkinsSnap = await getDocs(collection(db, "checkins"));
        const moodMap: { [key: string]: number } = {};

        checkinsSnap.forEach((doc) => {
          const data = doc.data();
          // ধরে নিচ্ছি চেক-ইন ডেটাবেসে mood বা feeling নামে ফিল্ড আছে
          const mood = data.mood || data.feeling || "Unknown";
          moodMap[mood] = (moodMap[mood] || 0) + 1;
        });

        const formattedCheckinData = Object.keys(moodMap).map(mood => ({
          name: mood,
          value: moodMap[mood]
        }));
        setCheckinData(formattedCheckinData);

      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-4 md:p-6 space-y-6">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          Analytics & Reports 📈
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Deep insights into user engagement and mental wellness metrics.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* User Growth Trend - Line Chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">User Growth Trend</h3>
            <p className="text-xs text-slate-400 mb-6">Visual representation of daily registrations.</p>
            
            <div className="h-72 w-full">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="Users" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: "#3b82f6" }} activeDot={{ r: 8 }} />
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p>Not enough user data to show chart.</p>
                </div>
              )}
            </div>
          </div>

          {/* Check-in Distributions - Pie Chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Check-in Distributions</h3>
            <p className="text-xs text-slate-400 mb-6">Mood trends breakdown over time.</p>
            
            <div className="h-72 w-full">
              {checkinData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={checkinData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {checkinData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p>No check-in data available yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}