"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AppSettings {
  maintenanceMode: boolean;
  allowSignups: boolean;
  enableJournals: boolean;
  appVersion: string;
  supportEmail: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    maintenanceMode: false,
    allowSignups: true,
    enableJournals: true,
    appVersion: "1.0.0",
    supportEmail: "support@mindpulse.com"
  });

  // ফায়ারবেস থেকে গ্লোবাল সেটিংস ফেচ করা
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          setSettings({
            ...settings, // ডিফল্ট ভ্যালুগুলো ব্যাকআপ হিসেবে রাখা
            ...data
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // ইনপুট বা টগল পরিবর্তন হ্যান্ডেল করা
  const handleChange = (field: keyof AppSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  // ফায়ারবেসে সেটিংস সেভ করা
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "settings", "global");
      // setDoc এর সাথে { merge: true } দিলে নতুন ফিল্ড অ্যাড হলেও পুরোনো গুলো মুছবে না
      await setDoc(docRef, settings, { merge: true });
      alert("Settings updated successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // সুন্দর টগল সুইচের জন্য একটি কাস্টম কম্পোনেন্ট
  const ToggleSwitch = ({ label, description, checked, onChange, danger = false }: { label: string, description: string, checked: boolean, onChange: (val: boolean) => void, danger?: boolean }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="pr-4">
        <h4 className={`text-sm font-bold ${danger && checked ? 'text-red-600' : 'text-slate-800'}`}>{label}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className={`w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${danger ? 'peer-checked:bg-red-500' : 'peer-checked:bg-emerald-500'}`}></div>
      </label>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-4 md:p-6 space-y-6 relative pb-24">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Settings ⚙️</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure global application preferences and system behaviors.
          </p>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving || loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
        >
          {isSaving ? "Saving Changes..." : "Save Configuration"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* System Control Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              System Controls
            </h3>
            
            <div className="space-y-2">
              <ToggleSwitch 
                label="Maintenance Mode" 
                description="Disable user access globally and show a maintenance screen."
                checked={settings.maintenanceMode}
                onChange={(val) => handleChange("maintenanceMode", val)}
                danger={true}
              />
              <ToggleSwitch 
                label="Allow New Registrations" 
                description="Let new users create accounts on the platform."
                checked={settings.allowSignups}
                onChange={(val) => handleChange("allowSignups", val)}
              />
              <ToggleSwitch 
                label="Enable Journal Feature" 
                description="Allow users to write and save daily journal entries."
                checked={settings.enableJournals}
                onChange={(val) => handleChange("enableJournals", val)}
              />
            </div>
          </div>

          {/* General Information Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
             <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              General Information
            </h3>
            
            <div className="space-y-5 mt-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">App Version</label>
                <input 
                  type="text" 
                  value={settings.appVersion}
                  onChange={(e) => handleChange("appVersion", e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., 1.0.0"
                />
                <p className="text-[11px] text-slate-400 mt-1">Displayed at the footer of the user dashboard.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Support Email Address</label>
                <input 
                  type="email" 
                  value={settings.supportEmail}
                  onChange={(e) => handleChange("supportEmail", e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="support@yourdomain.com"
                />
                <p className="text-[11px] text-slate-400 mt-1">Where users can send help requests.</p>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}