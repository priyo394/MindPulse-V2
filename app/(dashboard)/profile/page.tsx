"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";

export default function ProfilePage() {
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [joinedDate, setJoinedDate] = useState("Loading...");
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const [stats, setStats] = useState({ checkins: 0, journals: 0 });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || "User");
          setNewName(data.name || "User");
          setEmail(data.email || user.email);
          
          if (data.createdAt) {
            const date = new Date(data.createdAt);
            setJoinedDate(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          } else {
            setJoinedDate("Recently");
          }
        } else {
          setEmail(user.email || "");
        }

        const checkinsQ = query(collection(db, "checkins"), where("userId", "==", user.uid));
        const journalsQ = query(collection(db, "journals"), where("userId", "==", user.uid));
        
        const [checkinsSnap, journalsSnap] = await Promise.all([
          getDocs(checkinsQ),
          getDocs(journalsQ)
        ]);

        setStats({
          checkins: checkinsSnap.size,
          journals: journalsSnap.size
        });

      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleUpdateName = async () => {
    if (!newName.trim() || !user) return;
    
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: newName
      }, { merge: true });
      
      setName(newName);
      setIsEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: "success", text: "Password reset email sent! Check your inbox." });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to send password reset email." });
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto transition-colors duration-200">
      
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 text-xl shadow-sm border border-orange-200 dark:border-orange-800/50">
             👤
           </div>
           <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">My Profile</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base font-medium">Manage your account settings and view your activity.</p>
      </header>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 transition-all ${
          message.type === "success" 
            ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50" 
            : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50"
        }`}>
          {message.type === "success" ? "✅" : "⚠️"} {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center transition-colors">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-4xl mb-4 shadow-inner border border-blue-200 dark:border-blue-800/50">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 font-medium">{email}</p>
            
            <span className="inline-block bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              Joined {joinedDate}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Personal Information</h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800/50 transition-colors"
                    />
                    <button 
                      onClick={handleUpdateName}
                      disabled={isSaving}
                      className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold px-4 rounded-xl transition"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setNewName(name); }}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-4 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-medium transition-colors">
                    {name}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between transition-colors">
                  {email}
                  <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Email address cannot be changed directly for security reasons.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Account Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-4 transition-colors">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xl border border-indigo-200 dark:border-indigo-800/50">
                  📝
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Total Check-ins</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.checkins}</p>
                </div>
              </div>
              <div className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-4 transition-colors">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xl border border-green-200 dark:border-green-800/50">
                  📖
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Journals Written</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.journals}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 border-l-4 border-l-amber-400 transition-colors">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Security Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">Need to change your password? We will send a reset link to your email address.</p>
            <button 
              onClick={handlePasswordReset}
              className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 font-bold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
            >
              Send Password Reset Email
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}