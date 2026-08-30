import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const state = JSON.parse(fs.readFileSync('.neurona_api_keys.json', 'utf8'));
const key = state.gemini[0].key;
console.log("Using key:", key.substring(0, 8) + "...");
const ai = new GoogleGenAI({ apiKey: key });

async function run() {
  const models = ['imagen-3.0-generate-002', 'imagen-3.0-generate-001'];
  for (const model of models) {
     try {
         console.log("Testing generateImages with", model);
         const res = await ai.models.generateImages({
             model,
             prompt: "A happy dog in a field",
             config: { numberOfImages: 1 }
         });
         console.log("generateImages Success with", model);
         break;
     } catch (e: any) {
         console.log("generateImages Error with", model, e.message);
     }
  }
}
run().catch(console.error);
