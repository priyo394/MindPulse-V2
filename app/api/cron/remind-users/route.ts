import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // -------------------------------------------------------------
    // সিকিউরিটি চেক (লোকাল টেস্টের জন্য কমেন্ট করে রাখা হলো)
    // Vercel-এ পুশ করার আগে অবশ্যই সামনের // কেটে দেবেন!
    // -------------------------------------------------------------
     const authHeader = request.headers.get('authorization');
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
     }

    // Resend API ইনিশিয়ালাইজ করা
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }
    const resend = new Resend(resendApiKey);

    // আজকের তারিখের শুরু সেট করা
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const usersSnap = await adminDb.collection("users").get();
    let emailsSentCount = 0;

    // ইউজারদের ডেটাবেস চেক করা এবং ইমেইল পাঠানো
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (!userData.email) continue;

      const checkInSnap = await adminDb.collection("checkins")
        .where("userId", "==", userId)
        .where("timestamp", ">=", todayStart)
        .get();

      if (checkInSnap.empty) {
        await resend.emails.send({
          from: "MindPulse <onboarding@resend.dev>",
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
      }
    }

    return NextResponse.json({ success: true, count: emailsSentCount });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}