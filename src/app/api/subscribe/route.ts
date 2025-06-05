import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email
        })
      }
    );

    const data = await response.json();

    console.log("Subscription response:", data);
    // return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error capturing email:", error);
    return NextResponse.json(
      { error: "Failed to capture email" },
      { status: 500 }
    );
  }
}
