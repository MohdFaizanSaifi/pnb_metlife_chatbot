import OpenAI from "openai";
import "dotenv/config"; // Make sure to install dotenv: npm install dotenv

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- CONFIGURATION ---
// Paste the ID of your assistant from the OpenAI dashboard here
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID; // <-- PASTE YOUR ASSISTANT ID HERE

// This is the definition of the new tool you want to add
const newTool = {
    type: "function",
    function: {
      name: "save_to_google_sheet",
      description: "Use this function when the user has provided all necessary personal details (name, email, phone, age). The plan_summary should be a concise summary of the user's inquiry from the conversation history.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The full name of the user" },
          email: { type: "string", description: "The user's email address" },
          phone_number: { type: "string", description: "The user's phone number" },
          age: { type: "integer", description: "The user's age" },
          plan_summary: { type: "string", description: "A brief summary of the plan or topic discussed with the user." },
        },
        required: ["name", "email", "phone_number", "age", "plan_summary"],
      },
    },
  } as const; // <--- THE FIX IS HERE!
  
  async function updateAssistant() {
    if (!ASSISTANT_ID || ASSISTANT_ID.includes("xxxxxxxx")) {
      console.error("Error: Please paste your real Assistant ID into the ASSISTANT_ID variable.");
      return;
    }
  
    console.log(`Fetching assistant ${ASSISTANT_ID}...`);
    
    try {
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      console.log(`Found assistant: "${assistant.name}"`);
  
      const existingTools = assistant.tools;
      
      const toolExists = existingTools.some(
        (tool) => tool.type === 'function' && tool.function.name === newTool.function.name
      );
  
      if (toolExists) {
        console.log(`Tool "${newTool.function.name}" already exists on the assistant. If you need to update its definition, please remove it from the dashboard first and re-run this script.`);
        return;
      }
  
      console.log(`Adding new tool "${newTool.function.name}" to the assistant...`);
      
      // Now TypeScript knows newTool has the correct, specific type
      const updatedTools = [...existingTools, newTool];
  
      const updatedAssistant = await openai.beta.assistants.update(ASSISTANT_ID, {
        tools: updatedTools,
      });
  
      console.log("✅ Assistant updated successfully!");
      console.log("New tool list:", updatedAssistant.tools.map(t => t.type === 'function' ? t.function.name : t.type));
  
    } catch (error) {
      console.error("Error updating assistant:", error);
    }
  }
  
  updateAssistant();