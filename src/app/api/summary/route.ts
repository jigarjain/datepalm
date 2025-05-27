import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DATEPALM_OPENAI_API_KEY // Not exposed to client
});

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
          Summarise the conversation between a user and an AI assistant who played a role of relationship coach. The summary can be fed into the next conversation as a system prompt to carry the context of the conversation.
          Return the summary in json format with the following keys:
          - title: The title of the summary.
          - summary: The summary of the conversation.
          - key_points: A list of key points from the conversation.
          - action_items: A list of action items to improve the relationship.
          - next_steps: A list of next steps to take in the relationship.
          Make sure to return the summary in a valid json format. Do not include any other text in your response.
          `
        },
        {
          role: "user",
          content: `
          Here is the conversation:
          ${body.messages
            .map((message: { role: string; content: string }) => {
              return `${message.role}: ${message.content}`;
            })
            .join("\n")}
          `
        }
      ],
      response_format: { type: "json_object" }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
