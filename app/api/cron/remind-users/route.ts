import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Nodemailer ট্রান্সপোর্터 সেটআপ
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayString = todayStart.toISOString().split('T')[0];

    const usersSnap = await adminDb.collection("users").get();
    let emailsSentCount = 0;

    // আপনার নির্দিষ্ট অ্যাডমিন ইমেইলটি এখানে বসিয়ে দিন
    const adminEmail = "imammehedi2586@gmail.com"; 

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (!userData.email) continue;

      // ১. যদি ইউজারের ইমেইলটি অ্যাডমিনের ইমেইল হয়, তবে তাকে স্কিপ করবে
      if (userData.email === adminEmail) continue;

      // 🔥 এই লাইনটি অতিরিক্ত যুক্ত করা হয়েছে: 
      // অটোমেটিক ক্রন জবের সময় ডাবল মেইল ঠেকাতে এটি চেক করবে আজ অলরেডি মেইল গেছে কি না।
      // কিন্তু আপনি যখন ম্যানুয়ালি রান করবেন, তখন ফায়ারবেসের ডেট ক্লিয়ার রাখলে এটি বাধা দেবে না।
      const userAgent = request.headers.get('user-agent') || '';
      const isCronJob = userAgent.includes('vercel-cron');

      if (isCronJob && userData.lastAutoReminderDate === todayString) {
        continue;
      }

      const checkInSnap = await adminDb.collection("checkins")
        .where("userId", "==", userId)
        .where("timestamp", ">=", todayStart)
        .get();

      // যদি আজকের চেক-ইন না করে থাকে, তবে ইমেল পাঠানো হবে
      if (checkInSnap.empty) {
        try {
          await transporter.sendMail({
            from: `"MindPulse" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: "We miss you today! Take a moment for your wellness 🌿",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Hello ${userData.name || 'there'},</h2>
                <p>We noticed you haven't logged your wellness check-in today yet.</p>
                <a href="https://your-app.vercel.app/dashboard" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Complete Check-in</a>
              </div>
            `,
          });
          
          emailsSentCount++;

          // যদি অটোমেটিক ক্রন জব থেকে মেইল যায়, তবে আজকের ডেট সেভ করে রাখবে যাতে দ্বিতীয়বার আর ডাবল মেইল না আসে
          if (isCronJob) {
            await adminDb.collection("users").doc(userId).update({
              lastAutoReminderDate: todayString
            });
          }

        } catch (error) {
          console.error(`Failed to send email to ${userData.email}:`, error);
        }
      }
    }

    return NextResponse.json({ success: true, count: emailsSentCount });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}