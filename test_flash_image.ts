import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const state = JSON.parse(fs.readFileSync('.neurona_api_keys.json', 'utf8'));
const key = state.gemini[0]?.key || process.env.GEMINI_API_KEY;
if (!key) {
   console.error("No key available");
   process.exit(1);
}
console.log("Using key:", key.substring(0, 8) + "...");
const ai = new GoogleGenAI({ apiKey: key });

async function run() {
  const modelName = 'gemini-2.5-flash-image'; // User suggested
  try {
      console.log(`Testing generateImages with ${modelName}`);
      const res = await ai.models.generateImages({
          model: modelName,
          prompt: "A happy dog in a field",
          config: { numberOfImages: 1 }
      });
      console.log(`Success! Base64 length: ${res.generatedImages?.[0]?.image?.imageBytes?.length}`);
  } catch (e: any) {
      console.log(`Error generateImages with ${modelName}:`, JSON.stringify(e, null, 2));
      console.log(`Error message: ${e.message}`);
  }
}
run().catch(console.error);
