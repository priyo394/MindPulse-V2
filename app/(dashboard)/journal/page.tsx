"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [journals, setJournals] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [appSettings, setAppSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // ফায়ারবেস থেকে সেটিংস ফেচ করা
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setAppSettings(docSnap.data());
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // জার্নাল ফেচ করা
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const q = query(
        collection(db, "journals"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const jData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJournals(jData);
      });

      return () => unsubscribe();
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!user) {
      // if user unexpectedly null, redirect to login
      router.push("/login");
      return;
    }
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, "journals"), {
        userId: user.uid,
        title,
        content,
        createdAt: new Date()
      });
      setTitle("");
      setContent("");
    } catch (error) {
      console.error("Error adding journal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (appSettings?.maintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full border border-slate-100">
          <div className="text-5xl mb-4">🛠️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">We'll be right back!</h2>
          <p className="text-slate-500">MindPulse is currently under maintenance. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (appSettings?.enableJournals === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full border border-slate-100">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Journal feature is offline</h2>
          <p className="text-slate-500 mb-6">This feature has been temporarily disabled by the administrator. We are making some improvements.</p>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-100 transition border border-slate-200">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Premium Header */}
        <header className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-6 md:p-8 rounded-3xl border border-blue-100/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl md:text-4xl">📖</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">My Personal Journal</h1>
            </div>
            <p className="text-slate-500 font-medium text-sm md:text-base ml-1">Reflect on your day, track your mood, and clear your mind.</p>
          </div>
          {/* Decorative element */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-400 opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* Write Journal Form (Left Side) */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Write New Entry
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">How are you feeling?</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., A peaceful morning..."
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Your Thoughts</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Let it all out. What's on your mind today?"
                    required
                    rows={7}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm leading-relaxed resize-none font-medium text-slate-800 placeholder-slate-400"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                       <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Saving Entry...
                    </span>
                  ) : "Save Journal Entry"}
                </button>
              </form>
            </div>
          </div>

          {/* Previous Journals List (Right Side) */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4 px-1">
               <h2 className="text-lg font-bold text-slate-800">Past Reflections</h2>
               <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{journals.length} Entries</span>
            </div>
            
            <div className="space-y-4">
              {journals.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-4xl mb-4">✨</div>
                  <h3 className="text-slate-800 font-bold text-xl mb-2">A blank canvas</h3>
                  <p className="text-slate-500 text-sm max-w-sm">Your journey starts here. Write your first journal entry to begin tracking your thoughts and feelings over time.</p>
                </div>
              ) : (
                journals.map((journal) => (
                  <div key={journal.id} className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all duration-300">
                    <div className="flex justify-between items-start mb-3 gap-4">
                      <h3 className="font-bold text-lg md:text-xl text-slate-800 group-hover:text-blue-600 transition-colors">{journal.title}</h3>
                      <span className="shrink-0 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        {journal.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {journal.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}