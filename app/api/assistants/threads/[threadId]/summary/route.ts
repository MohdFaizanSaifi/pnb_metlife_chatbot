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
          content: `
          You will be provided with a chat transcript between a user and an assistant discussing insurance plans. Your task is to summarize the chat by focusing on the following:

          Identify and list the specific types of insurance plans the user showed interest in.
          Highlight any detailed information the user inquired about regarding specific insurance plans.

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