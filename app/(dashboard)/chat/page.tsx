"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

type Message = {
  id?: string;
  text: string;
  sender: "user" | "ai";
  timestamp: any;
};

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default function ChatPage() {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // ফায়ারবেস থেকে ইউজারের চ্যাট হিস্ট্রি রিয়েল-টাইমে লোড করা
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "chats"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      // যদি ডাটাবেসে কোনো চ্যাট না থাকে, তবে ওয়েলকাম মেসেজ দেখাবে
      if (loadedMessages.length === 0) {
        setMessages([
          {
            text: "Hello! I am your MindPulse AI Assistant. 🤖 How are you feeling today? You can share your thoughts or ask for mental wellness tips in English, Bangla, or Banglish!",
            sender: "ai",
            timestamp: new Date(),
          }
        ]);
      } else {
        setMessages(loadedMessages);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      if (!geminiApiKey) {
        throw new Error("Gemini API Key is missing in .env.local file!");
      }

      // ১. ইউজারের মেসেজ ফায়ারবেসে সেভ করা
      await addDoc(collection(db, "users", user.uid, "chats"), {
        text: currentInput,
        sender: "user",
        timestamp: serverTimestamp(),
      });

      // ২. Gemini API-তে প্রম্পট পাঠানো
      const prompt = `You are a highly empathetic and professional mental health assistant named MindPulse AI. 
      CRITICAL INSTRUCTION: The user will speak in English, Bengali (Bangla script), or Banglish (Bengali written in English letters like 'kmn aso', 'ghum hoi nai'). 
      You MUST understand Banglish perfectly and reply back EXACTLY in the same language style. If they use Banglish, reply in natural, conversational Banglish. Be a supportive friend.
      
      User message: "${currentInput}"`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
         console.error("Gemini API Error:", data);
         throw new Error(data.error?.message || "API request failed");
      }

      const responseText = data.candidates[0].content.parts[0].text;

      // ৩. AI-এর রিপ্লাই ফায়ারবেসে সেভ করা
      await addDoc(collection(db, "users", user.uid, "chats"), {
        text: responseText,
        sender: "ai",
        timestamp: serverTimestamp(),
      });

    } catch (error: any) {
      console.error("AI Chat Error:", error);
      const errorMsg = `Sorry, I am having trouble connecting right now. Error: ${error.message}`;
      
      await addDoc(collection(db, "users", user.uid, "chats"), {
        text: errorMsg,
        sender: "ai",
        timestamp: serverTimestamp(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] w-full max-w-5xl mx-auto bg-[#f8fafc]">
      
      <header className="shrink-0 p-4 md:p-6 flex items-center gap-4 bg-white/50 backdrop-blur-sm border-b border-slate-100 z-10 sticky top-0">
        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-2xl shadow-sm border border-teal-200">
          🤖
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 leading-tight">MindPulse AI</h2>
          <p className="text-xs font-semibold text-teal-600 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            Online & Ready to listen (Cloud Saved)
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
        {messages.map((msg, index) => (
          <div 
            key={msg.id || index} 
            className={`flex items-end gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm shrink-0 border border-teal-200 shadow-sm mb-1">
                🤖
              </div>
            )}
            
            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
              msg.sender === "user" 
                ? "bg-blue-600 text-white rounded-br-sm" 
                : "bg-white text-slate-700 border border-slate-100 rounded-bl-sm"
            }`}>
              <div className={`text-sm md:text-base leading-relaxed ${msg.sender === "user" ? "font-medium" : ""}`} dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br/>')}} />
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0 shadow-sm mb-1">
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-end gap-3 justify-start">
             <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm shrink-0 border border-teal-200 shadow-sm mb-1">
                🤖
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm p-4 shadow-sm flex gap-1.5 items-center h-[52px]">
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 p-4 md:p-6 bg-white border-t border-slate-200">
        <form 
          onSubmit={handleSendMessage} 
          className="flex items-center gap-3 max-w-4xl mx-auto relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full py-3.5 pl-6 pr-14 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 font-semibold mt-3">
          AI Assistant can make mistakes. Please consider verifying important information.
        </p>
      </div>

    </div>
  );
}