"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, auth } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // সেটিংসের স্টেট
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isExporting, setIsExporting] = useState(false);

  // ডাটাবেস থেকে ইউজারের সেভ করা সেটিংস নিয়ে আসা
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().settings) {
          const s = userDoc.data().settings;
          if (s.dailyReminder !== undefined) setDailyReminder(s.dailyReminder);
          if (s.weeklyReport !== undefined) setWeeklyReport(s.weeklyReport);
          if (s.darkMode !== undefined) setDarkMode(s.darkMode);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    fetchSettings();
  }, [user]);

  // ডাটাবেসে সেটিং আপডেট করার ফাংশন
  const updateSettingInDB = async (settingKey: string, newValue: boolean) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        settings: {
          [settingKey]: newValue
        }
      }, { merge: true }); // merge: true দিলে আগের ডেটা (যেমন নাম) মুছে যাবে না
    } catch (error) {
      console.error("Error updating setting:", error);
      setMessage({ type: "error", text: "Failed to save setting." });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  // টগল হ্যান্ডলারগুলো
  const handleToggleDaily = () => {
    const newValue = !dailyReminder;
    setDailyReminder(newValue);
    updateSettingInDB("dailyReminder", newValue);
  };

  const handleToggleWeekly = () => {
    const newValue = !weeklyReport;
    setWeeklyReport(newValue);
    updateSettingInDB("weeklyReport", newValue);
  };

  const handleToggleDark = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    updateSettingInDB("darkMode", newValue);
  };

  // CSV এক্সপোর্ট করার ফাংশন
  const handleExportCSV = async () => {
    if (!user) return;
    setIsExporting(true);
    setMessage({ type: "", text: "" });

    try {
      const q = query(collection(db, "checkins"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setMessage({ type: "error", text: "No check-in data found to export." });
        setIsExporting(false);
        return;
      }

      // CSV এর হেডার তৈরি
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Date,Mood,Stress Level,Sleep Hours,Note\n";

      // প্রতিটি ডেটা লুপ করে CSV তে অ্যাড করা
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp?.toDate ? new Date(data.timestamp.toDate()).toLocaleDateString() : "N/A";
        const note = data.note ? data.note.replace(/,/g, " ") : ""; // কমা (,) থাকলে তা রিমুভ করা হচ্ছে
        csvContent += `${date},${data.mood},${data.stressLevel},${data.sleepHours},${note}\n`;
      });

      // ডাউনলোড ট্রিগার করা
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "mindpulse_my_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage({ type: "success", text: "Data exported successfully!" });
    } catch (error) {
      console.error("Export error:", error);
      setMessage({ type: "error", text: "Failed to export data." });
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  // অ্যাকাউন্ট ডিলিট করার ফাংশন
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.");
    if (!confirmDelete || !auth.currentUser) return;

    try {
      await deleteUser(auth.currentUser);
      router.push("/login");
    } catch (error: any) {
      console.error("Delete account error:", error);
      // Firebase সিকিউরিটির জন্য অনেক সময় রি-অথেন্টিকেশন চায়
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: "error", text: "Please log out and log in again to delete your account." });
      } else {
        setMessage({ type: "error", text: "Failed to delete account." });
      }
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-700 text-xl shadow-sm">
             ⚙️
           </div>
           <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Settings</h2>
        </div>
        <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">Manage your app preferences and account settings.</p>
      </header>

      {/* Message Alert */}
      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "success" ? "✅" : "⚠️"} {message.text}
        </div>
      )}

      <div className="space-y-6">
        
        {/* 1. Notifications Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800">Notifications</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Control how and when we send you notifications.</p>
          </div>
          <div className="p-6 space-y-6">
            <ToggleSwitch 
              label="Daily Check-in Reminder" 
              description="Get a daily email reminding you to log your mood and sleep."
              enabled={dailyReminder}
              onChange={handleToggleDaily}
            />
            <div className="w-full h-px bg-slate-100"></div>
            <ToggleSwitch 
              label="Weekly Progress Report" 
              description="Receive a weekly summary of your wellness score and insights."
              enabled={weeklyReport}
              onChange={handleToggleWeekly}
            />
          </div>
        </div>

        {/* 2. Appearance Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800">Appearance</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Customize the look and feel of MindPulse.</p>
          </div>
          <div className="p-6">
            <ToggleSwitch 
              label="Dark Mode" 
              description="Switch to a dark theme for a better viewing experience at night (Coming soon)."
              enabled={darkMode}
              onChange={handleToggleDark}
            />
          </div>
        </div>

        {/* 3. Data & Privacy */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800">Data & Privacy</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage your personal data and account status.</p>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Export My Data</h4>
                <p className="text-sm text-slate-500">Download a copy of your check-in history as a CSV file.</p>
              </div>
              <button 
                onClick={handleExportCSV}
                disabled={isExporting}
                className="bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold px-5 py-2.5 rounded-xl transition shadow-sm text-sm shrink-0 disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export as CSV"}
              </button>
            </div>
            
            <div className="w-full h-px bg-slate-100"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-red-600 mb-1">Delete Account</h4>
                <p className="text-sm text-slate-500">Permanently delete your account and all associated data. This action cannot be undone.</p>
              </div>
              <button 
                onClick={handleDeleteAccount}
                className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-5 py-2.5 rounded-xl transition shadow-sm text-sm shrink-0 border border-red-100"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* 4. About & Support */}
        <div className="text-center py-6">
          <p className="text-sm font-bold text-slate-400">MindPulse v1.0.0</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm font-semibold text-blue-600">
            <a href="#" className="hover:underline">Help Center</a>
            <span className="text-slate-300">•</span>
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span className="text-slate-300">•</span>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>

      </div>
    </div>
  );
}

// Reusable Toggle Switch Component (Tailwind CSS Only)
function ToggleSwitch({ label, description, enabled, onChange }: { label: string, description: string, enabled: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h4 className="font-bold text-slate-800 mb-1">{label}</h4>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button 
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-300 ease-in-out ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}