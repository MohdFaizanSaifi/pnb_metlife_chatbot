import { openai } from "@/app/openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } },
) {
  try {
    const { threadId } = params;

    const messages = await openai.beta.threads.messages.list(threadId);

    const conversation = messages.data.map(msg => `${msg.role}: ${msg.content[0]?.type === 'text' ? msg.content[0].text.value : ''}`).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano", // Changed to gpt-3.5-turbo for broader access
      messages: [
        {
          role: "system",
          content: `Below is a conversation between a user and an assistant.
          Summarize only the user’s messages in a clear and concise way.
          Preserve all key information the user asked for, including specific insurance plan names (e.g., Aajeevan Suraksha), types of coverage (e.g., group insurance, critical illness), requests for comparisons, or any plan details they asked about.
          Ignore assistant responses entirely. The summary should reflect exactly what the user wanted to know, combining all their questions into a coherent summary.
        `},
        { role: "user", content: conversation },
      ],
    });

    const planSummary = completion.choices[0].message.content;

    return NextResponse.json({ planSummary });
  } catch (error: any) {
    console.error("Error summarizing thread:", error.message || error);
    return NextResponse.json({ error: "Failed to summarize thread." }, { status: 500 });
  }
} 