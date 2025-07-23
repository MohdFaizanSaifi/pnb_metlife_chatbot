import { openai } from "@/app/openai";
import { assistantId } from "@/app/assistant-config";

export const runtime = "nodejs";
 
const googleSheetTool = {
  type: "function",
  function: {
    name: "save_to_google_sheet",
    description: "Use this function when the user has provided email, phone number.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The full name of the user" },
        email: { type: "string", description: "The user's email address" },
        phone_number: { type: "string", description: "The user's phone number" },
        age: { type: "integer", description: "The user's age" },
        plan_summary: { type: "string", description: "A plan should be identified by the assistant itself according to the user conversation." },
      },
      required: ["name", "email", "phone_number", "age", "plan_summary"],
    },
  },
} as const;



// Create a new assistant
export async function POST() {

  let currentAssistantId = assistantId;

  await openai.beta.assistants.retrieve(currentAssistantId); 
  const assistant = await openai.beta.assistants.retrieve(currentAssistantId); 
  console.log(`Tools available in the assistant : ${assistant.tools}`);
  const hasGoogleSheetTool = assistant.tools.some(
    (tool) => tool.type === "function" && tool.function.name === "save_to_google_sheet"
  );

  if (!hasGoogleSheetTool) {
    await openai.beta.assistants.update(currentAssistantId, {
      tools: [...assistant.tools, googleSheetTool],
    });
  }

  return Response.json({ assistantId: currentAssistantId });
}
