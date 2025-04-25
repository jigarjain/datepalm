import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DATEPALM_OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Log some info about the file
    console.log("File received:", {
      name: file.name,
      type: file.type,
      size: file.size
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Ensure file has the correct type
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Must be an audio file.` },
        { status: 400 }
      );
    }

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1"
    });

    return NextResponse.json({ text: response.text });
  } catch (error: unknown) {
    console.error("Error transcribing audio:", error);

    // Provide more detailed error information by checking the error type
    let errorMessage = "Failed to transcribe audio";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Check if error is an object and has a status property
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      statusCode = error.status;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
