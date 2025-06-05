import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DATEPALM_OPENAI_API_KEY // Not exposed to client
});

export async function POST() {
  try {
    const session = await openai.beta.realtime.sessions.create({
      model: "gpt-4o-realtime-preview",
      voice: "shimmer",
      input_audio_transcription: {
        model: "whisper-1"
      }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching token:", error);
    return NextResponse.json(
      { error: "Failed to fetch token" },
      { status: 500 }
    );
  }
}
