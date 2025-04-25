import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DATEPALM_OPENAI_API_KEY // Not exposed to client
});

export async function POST(request: Request) {
  try {
    const { text, threadId, assistantId } = await request.json();

    // Add message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: text
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    do {
      await new Promise((res) => setTimeout(res, 200));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed");

    // Get messages
    const messagesResponse = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messagesResponse.data.find(
      (m) => m.role === "assistant"
    );

    // Handle the content properly by checking type
    let responseText = "No response";
    if (assistantMessage?.content[0]?.type === "text") {
      responseText = assistantMessage.content[0].text.value;
    }

    return NextResponse.json({
      response: responseText
    });
  } catch (error) {
    console.error("Error processing message:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
