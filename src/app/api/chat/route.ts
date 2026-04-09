import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { message, campgrounds, history } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    //change array campground to text
    const campgroundList = campgrounds
      .map((c: any) => `- ${c.name} (${c.address}, Tel: ${c.tel})`)
      .join("\n");

    const conversationHistory = history
      .map(
        (msg: any) =>
          `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}`,
      )
      .join("\n");

    const prompt = `
You are "Ember", a friendly and knowledgeable camping assistant for "Campfire" - a campground booking website.
Your goal is to help users find the perfect campground and provide useful camping tips.

Available campgrounds in our system:
${campgroundList}

Guidelines:
- Reply in the same language as the user (Thai or English)
- Be warm, friendly and enthusiastic about camping 🏕️
- If recommending campgrounds, always mention specific names from the list above
- If user asks about a specific campground, provide details you know about it
- If user asks for camping tips, give practical and helpful advice
- If no campgrounds match what user wants, suggest the closest alternative
- Keep responses concise (max 3-4 sentences)
- Never recommend campgrounds not in the list above
- If user wants to book, tell them to click on the campground card to proceed

Previous conversation:
${conversationHistory}

User message: ${message}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    return NextResponse.json(
      { reply: "Sorry, something went wrong." },
      { status: 500 },
    );
  }
}
