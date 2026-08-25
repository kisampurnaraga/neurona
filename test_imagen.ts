import { GoogleGenAI } from "@google/genai";
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: 'a cat',
      config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
    });
    console.log("Success:", res.generatedImages?.length);
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}
test();
