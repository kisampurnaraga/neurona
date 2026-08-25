import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const interaction = await ai.interactions.create({
      model: 'gemini-3.1-flash-tts-preview',
      input: 'Halo ini tes',
      response_modalities: ['AUDIO']
    });
    console.log("Success text:", interaction);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
