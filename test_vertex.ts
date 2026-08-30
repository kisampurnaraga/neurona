import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Halo ini tes'
    });
    console.log("Success text:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
