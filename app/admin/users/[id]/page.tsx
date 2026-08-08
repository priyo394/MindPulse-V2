"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../../lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    async function fetchUser() {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such user found!");
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  const handleToggleRole = async () => {
    if (!user) return;
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Are you sure you want to change role to ${newRole}?`)) return;
    
    try {
      setUpdating(true);
      const docRef = doc(db, "users", userId);
      await updateDoc(docRef, { role: newRole });
      setUser({ ...user, role: newRole });
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    if (!confirm(`Are you sure you want to set status to ${newStatus}?`)) return;
    
    try {
      setUpdating(true);
      const docRef = doc(db, "users", userId);
      await updateDoc(docRef, { status: newStatus });
      setUser({ ...user, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      setUpdating(true);
      await deleteDoc(doc(db, "users", userId));
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 p-4 space-y-4">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <button 
          onClick={() => router.back()} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Profile & Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage user access, status, and view detailed account insights.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center text-center transition-colors">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-4xl font-black mb-4 shadow-lg shadow-blue-500/20">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user.name || "Unnamed User"}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
          
          <div className="flex items-center gap-2 mt-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              user.role === 'admin' 
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50' 
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
            }`}>
              {user.role || "user"}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5 ${
              user.status === 'suspended' 
                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50' 
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'suspended' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
              {user.status || "active"}
            </span>
          </div>
        </div>

        {/* Right Column: Detailed Stats & Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">Account Information</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="font-medium text-slate-500 dark:text-slate-400">User ID</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono text-xs bg-slate-200/60 dark:bg-slate-800 px-2 py-1 rounded">{user.id}</span>
              </div>

              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="font-medium text-slate-500 dark:text-slate-400">Registration Date</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Actions Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">Administrative Actions</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleToggleRole}
                disabled={updating}
                className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 rounded-xl font-semibold text-xs transition disabled:opacity-50"
              >
                {user.role === 'admin' ? '⬇️ Demote to User' : '⭐ Promote to Admin'}
              </button>

              <button
                onClick={handleToggleStatus}
                disabled={updating}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition border disabled:opacity-50 ${
                  user.status === 'suspended'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                }`}
              >
                {user.status === 'suspended' ? '🟢 Activate Account' : '🚫 Suspend Account'}
              </button>

              <button
                onClick={handleDeleteUser}
                disabled={updating}
                className="px-4 py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-xl font-semibold text-xs transition disabled:opacity-50 ml-auto"
              >
                🗑️ Delete User
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}