"use client";

import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";

// টিপসের ক্যাটাগরি এবং ডেটা
const CATEGORIES = ["All", "Sleep", "Stress", "Mindfulness", "Productivity"];

const WELLNESS_TIPS = [
  { 
    id: 1, 
    title: "The 4-7-8 Breathing Technique", 
    category: "Stress", 
    desc: "Inhale for 4 seconds, hold your breath for 7 seconds, and exhale completely for 8 seconds. This helps calm the nervous system and reduce anxiety.", 
    icon: "😮‍💨", 
    color: "bg-blue-50 text-blue-600 border-blue-100" 
  },
  { 
    id: 2, 
    title: "Digital Detox Before Bed", 
    category: "Sleep", 
    desc: "Turn off all screens at least 1 hour before bed. The blue light from phones and laptops disrupts melatonin production, making it harder to fall asleep.", 
    icon: "📱", 
    color: "bg-indigo-50 text-indigo-600 border-indigo-100" 
  },
  { 
    id: 3, 
    title: "5-Minute Gratitude Journal", 
    category: "Mindfulness", 
    desc: "Start your day by writing down 3 things you are grateful for. This simple practice shifts your focus from negative to positive.", 
    icon: "✍️", 
    color: "bg-green-50 text-green-600 border-green-100" 
  },
  { 
    id: 4, 
    title: "The Pomodoro Technique", 
    category: "Productivity", 
    desc: "Work for 25 minutes with full focus, then take a 5-minute break. This prevents mental burnout and keeps your productivity high.", 
    icon: "⏱️", 
    color: "bg-orange-50 text-orange-600 border-orange-100" 
  },
  { 
    id: 5, 
    title: "Progressive Muscle Relaxation", 
    category: "Stress", 
    desc: "Slowly tense and then release each muscle group in your body, starting from your toes up to your head. Great for releasing physical tension.", 
    icon: "🧘", 
    color: "bg-red-50 text-red-600 border-red-100" 
  },
  { 
    id: 6, 
    title: "Optimal Hydration", 
    category: "Mindfulness", 
    desc: "Dehydration can cause fatigue, headaches, and even anxiety. Keep a water bottle nearby and aim for at least 8 glasses a day.", 
    icon: "💧", 
    color: "bg-cyan-50 text-cyan-600 border-cyan-100" 
  },
  { 
    id: 7, 
    title: "Morning Sunlight Exposure", 
    category: "Sleep", 
    desc: "Get 10-15 minutes of natural sunlight within an hour of waking up. It resets your circadian rhythm and improves night-time sleep.", 
    icon: "☀️", 
    color: "bg-yellow-50 text-yellow-600 border-yellow-100" 
  },
  { 
    id: 8, 
    title: "Declutter Your Workspace", 
    category: "Productivity", 
    desc: "A cluttered desk leads to a cluttered mind. Take 5 minutes at the end of the day to organize your workspace for a fresh start tomorrow.", 
    icon: "🧹", 
    color: "bg-purple-50 text-purple-600 border-purple-100" 
  }
];

export default function WellnessTipsPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");

  if (!user) return null;

  // ক্যাটাগরি অনুযায়ী ফিল্টার করা
  const filteredTips = activeCategory === "All" 
    ? WELLNESS_TIPS 
    : WELLNESS_TIPS.filter(tip => tip.category === activeCategory);

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 text-xl shadow-sm">
             🌿
           </div>
           <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Wellness Tips</h2>
        </div>
        <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">Discover actionable advice to improve your mental health, sleep, and daily focus.</p>
      </header>

      {/* Featured Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-6 md:p-8 mb-8 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="bg-white/20 text-teal-50 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block border border-white/20">Daily Highlight</span>
          <h3 className="text-2xl font-bold mb-2">Practice Mindfulness Everyday</h3>
          <p className="text-teal-50 font-medium max-w-2xl">
            "Mindfulness isn't about clearing your mind; it's about focusing on the present moment without judgment. Take a deep breath right now, notice how you feel, and continue your day with intention."
          </p>
        </div>
        <div className="text-6xl opacity-90 hidden md:block">
          🧘‍♀️
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
              activeCategory === category 
              ? "bg-slate-800 text-white shadow-md" 
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        {filteredTips.map(tip => (
          <div key={tip.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
            
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${tip.color} group-hover:scale-110 transition-transform duration-300`}>
                {tip.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                {tip.category}
              </span>
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                {tip.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {tip.desc}
              </p>
            </div>
            
          </div>
        ))}
      </div>

      {/* Bottom Call to Action */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
        <h4 className="font-bold text-blue-800 mb-2">Need personalized advice?</h4>
        <p className="text-sm text-blue-600 font-medium mb-4">Chat with our AI Assistant to get tips tailored specifically to how you're feeling today.</p>
        <a href="/chat" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm transition">
          Talk to AI Assistant →
        </a>
      </div>

    </div>
  );
}