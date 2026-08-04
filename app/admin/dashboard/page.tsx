"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [totalJournals, setTotalJournals] = useState(0);
  const [avgWellnessScore, setAvgWellnessScore] = useState<string>("--");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        // ১. ইউজার ডেটা ফেচ করা
        const usersSnap = await getDocs(collection(db, "users"));
        setTotalUsers(usersSnap.size);
        
        const usersData: any[] = [];
        usersSnap.forEach((doc) => {
          usersData.push({ id: doc.id, ...doc.data() });
        });
        setUsersList(usersData);

        // ২. চেক-ইন ডেটা ফেচ করা এবং এভারেজ স্কোর বের করা
        const checkInsSnap = await getDocs(collection(db, "checkins"));
        setTotalCheckIns(checkInsSnap.size);

        if (!checkInsSnap.empty) {
          let totalScore = 0;
          let count = 0;
          checkInsSnap.forEach((doc) => {
            const data = doc.data();
            // মুড বা স্লিপ থেকে একটি সিম্পল ক্যালকুলেশন
            let score = 7; // ডিফল্ট বেস স্কোর
            if (data.mood === "Great" || data.mood === "Happy") score = 9;
            else if (data.mood === "Good") score = 8;
            else if (data.mood === "Okay" || data.mood === "Neutral") score = 6;
            else if (data.mood === "Low" || data.mood === "Sad") score = 4;
            
            totalScore += score;
            count++;
          });
          setAvgWellnessScore((totalScore / count).toFixed(1));
        }

        // ৩. জার্নাল ডেটা ফেচ করা
        const journalsSnap = await getDocs(collection(db, "journals"));
        setTotalJournals(journalsSnap.size);

      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  // ইউজারদের CSV এক্সপোর্ট করার ফাংশন
  const exportUsersCSV = () => {
    if (usersList.length === 0) return alert("No users to export!");
    
    let csvContent = "data:text/csv;charset=utf-8,ID,Name,Email,Role\n";
    usersList.forEach((u) => {
      csvContent += `"${u.id}","${u.name || 'N/A'}","${u.email || 'N/A'}","${u.role || 'user'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mindpulse_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-4 md:p-6 space-y-6">
      
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Total Users</p>
          <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{loading ? "..." : totalUsers}</h3>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">Live from Firestore</span>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Total Check-ins</p>
          <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{loading ? "..." : totalCheckIns}</h3>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">Live from Firestore</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Total Journals</p>
          <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{loading ? "..." : totalJournals}</h3>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">Live from Firestore</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Avg. Wellness Score</p>
          <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{loading ? "..." : `${avgWellnessScore} / 10`}</h3>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">Calculated average</span>
        </div>
      </div>

      {/* Users Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">All Registered Users</h3>
          <Link href="/admin/users" className="text-xs font-bold text-blue-600 hover:underline">
            Manage All →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                <th className="pb-3 pl-2">Name / ID</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading users...</td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No registered users found.</td>
                </tr>
              ) : (
                usersList.slice(0, 5).map((u, index) => (
                  <tr key={u.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3 pl-2 font-medium text-slate-800">{u.name || "User " + (index + 1)}</td>
                    <td className="py-3 text-slate-600">{u.email}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-600 capitalize">
                        {u.role || "user"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <Link href={`/admin/manage-users`} className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Bottom Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <Link href="/admin/wellness-tips" className="p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl font-semibold text-sm transition border border-emerald-100 flex flex-col items-center justify-center gap-1 text-center">
          <span>➕ Add Wellness Tip</span>
        </Link>

        <Link href="/admin/announcements" className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl font-semibold text-sm transition border border-blue-100 flex flex-col items-center justify-center gap-1 text-center">
          <span>📢 Create Announcement</span>
        </Link>

        <Link href="/admin/analytics" className="p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl font-semibold text-sm transition border border-purple-100 flex flex-col items-center justify-center gap-1 text-center">
          <span>📄 Generate Report</span>
        </Link>

        <button onClick={exportUsersCSV} className="p-4 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-2xl font-semibold text-sm transition border border-teal-100 flex flex-col items-center justify-center gap-1">
          <span>📥 Export Users (CSV)</span>
        </button>

        <Link href="/admin/settings" className="p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl font-semibold text-sm transition border border-amber-100 flex flex-col items-center justify-center gap-1 text-center">
          <span>⚙️ System Settings</span>
        </Link>

      </div>

    </div>
  );
}