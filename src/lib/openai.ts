const ASSISTANT_ID = process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

export async function transcribeAudio(audioBlob: Blob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    }
  );

  const data = await response.json();
  return data.text;
}

export async function sendToAssistant(text: string, threadId: string) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2"
  };

  // 2. Add message
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      role: "user",
      content: text
    })
  });

  // 3. Run the assistant
  const runRes = await fetch(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ assistant_id: ASSISTANT_ID })
    }
  );
  const run = await runRes.json();

  // 4. Poll for completion
  let runStatus;
  do {
    const statusRes = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`,
      {
        headers
      }
    );
    runStatus = await statusRes.json();
    await new Promise((res) => setTimeout(res, 1000));
  } while (runStatus.status !== "completed");

  // 5. Get messages
  const messagesRes = await fetch(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    {
      headers
    }
  );
  const messages = await messagesRes.json();

  const assistantMessage = messages.data.find(
    (m: { role: string }) => m.role === "assistant"
  );
  return assistantMessage?.content[0]?.text?.value || "No response";
}
