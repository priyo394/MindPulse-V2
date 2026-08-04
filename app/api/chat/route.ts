import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// API Key দিয়ে Gemini ইনিশিয়ালাইজ করা
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // আমরা gemini-1.5-flash মডেল ব্যবহার করছি
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // এআই-কে নির্দেশ দেওয়া হচ্ছে সে কীভাবে কথা বলবে (System Prompt)
    const systemPrompt = `You are a highly empathetic, supportive, and professional mental health and wellness assistant for a platform named MindPulse. 
    User said: "${prompt}"
    Respond in a caring, helpful, and concise manner in Bengali language. Avoid medical diagnosis, but offer comfort and wellness tips.`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "এআই রেসপন্স জেনারেট করতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }
}