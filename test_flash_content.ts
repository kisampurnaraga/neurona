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
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-image'];
  for (const modelName of models) {
      try {
          console.log(`\nTesting generateContent with ${modelName}`);
          const res = await ai.models.generateContent({
              model: modelName,
              contents: [{role: 'user', parts: [{text: 'A happy dog in a field'}]}],
              config: { responseModalities: ["IMAGE"] }
          });
          console.log(`Success! Candidates: ${res.candidates?.length}`);
      } catch (e: any) {
          console.log(`Error with ${modelName}:`, e.message);
      }
  }
}
run().catch(console.error);
