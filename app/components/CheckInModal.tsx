"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
  existingData?: any;
}

const MOODS = [
  { id: "Great", emoji: "😄", label: "Great", color: "hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:border-green-800", active: "bg-green-100 border-green-500 text-green-700 dark:bg-green-950/60 dark:border-green-500 dark:text-green-300" },
  { id: "Good", emoji: "🙂", label: "Good", color: "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 dark:hover:border-blue-800", active: "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:border-blue-500 dark:text-blue-300" },
  { id: "Okay", emoji: "😐", label: "Okay", color: "hover:bg-yellow-50 hover:border-yellow-200 dark:hover:bg-yellow-950/30 dark:hover:border-yellow-800", active: "bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-950/60 dark:border-yellow-500 dark:text-yellow-300" },
  { id: "Low", emoji: "😔", label: "Low", color: "hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-800", active: "bg-red-100 border-red-500 text-red-700 dark:bg-red-950/60 dark:border-red-500 dark:text-red-300" },
];

export default function CheckInModal({ isOpen, onClose, userId, onSuccess, existingData }: CheckInModalProps) {
  const [mood, setMood] = useState<string>("");
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [sleepHours, setSleepHours] = useState<number | "">("");
  const [note, setNote] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && existingData) {
      setMood(existingData.mood || "");
      setStressLevel(existingData.stressLevel || 5);
      setSleepHours(existingData.sleepHours || "");
      setNote(existingData.note || "");
    } else if (isOpen && !existingData) {
      setMood("");
      setStressLevel(5);
      setSleepHours("");
      setNote("");
    }
  }, [isOpen, existingData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood || sleepHours === "") {
      setError("Please select mood and sleep hours.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (existingData && existingData.id) {
        await updateDoc(doc(db, "checkins", existingData.id), {
          mood,
          stressLevel,
          sleepHours: Number(sleepHours),
          note,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "checkins"), {
          userId,
          mood,
          stressLevel,
          sleepHours: Number(sleepHours),
          note,
          timestamp: serverTimestamp(),
        });
      }
      
      setIsSubmitting(false);
      onSuccess(); 
    } catch (error) {
      console.error("Check-in error:", error);
      setError("Failed to save check-in. Try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
        >
          ✕
        </button>

        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex w-12 h-12 bg-blue-100 dark:bg-blue-950/60 rounded-full items-center justify-center text-blue-600 dark:text-blue-400 text-xl shadow-sm mb-3">
              ✨
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {existingData ? "Update Check-In" : "Daily Check-In"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">How are you feeling today?</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl text-center border border-red-100 dark:border-red-900/50">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Mood Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">Your Mood</label>
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {MOODS.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    className={`cursor-pointer flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all duration-200 ${
                      mood === m.id ? m.active : `border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 ${m.color}`
                    }`}
                  >
                    <span className="text-2xl mb-1 transform transition-transform hover:scale-110">{m.emoji}</span>
                    <span className={`text-[10px] md:text-xs font-bold ${mood === m.id ? "" : "text-slate-500 dark:text-slate-400"}`}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stress Level */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stress Level</label>
                <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold">
                  {stressLevel} / 10
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={stressLevel} 
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">
                <span>Relaxed</span>
                <span>Stressed</span>
              </div>
            </div>

            {/* Sleep Hours */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Sleep (Hours)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lg">
                  🛌
                </div>
                <input 
                  type="number" 
                  min="0" 
                  max="24"
                  step="0.5"
                  placeholder="e.g. 7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Note (Optional)</label>
              <textarea 
                placeholder="Anything specific on your mind?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl text-white font-bold transition-all shadow-sm flex items-center justify-center gap-2 mt-2 ${
                isSubmitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 hover:-translate-y-0.5"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : existingData ? (
                "Update Check-In"
              ) : (
                "Complete Check-In"
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}