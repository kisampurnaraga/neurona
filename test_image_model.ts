import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001', 'gemini-2.5-flash'];
  for (const model of models) {
     try {
         console.log("Testing model:", model);
         const res = await ai.models.generateContent({
             model,
             contents: "A happy dog in a field"
         });
         console.log("Success with", model);
         break;
     } catch (e: any) {
         console.log("Error with", model, e.message);
     }
  }
}
run().catch(console.error);
