import { GoogleGenAI } from '@google/genai';
import { FounderService } from '../src/server/fcc/FounderService';

export class NeuronaChatService {
  private static chatHistories = new Map<string, Array<{role: string, parts: any[]}>>();

  static async chat(userId: string, userMessage: string, history: any[] = []): Promise<{ message: string, action: string | null }> {
    try {
      const apiKey = process.env.GEMINI_MANUAL_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing');

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      const systemInstruction = `Kamu adalah NEURONA, Asisten AI cerdas, proaktif, dan ramah (Creative Director) dari platform Neuronna Video Studio. Kamu memanggil pengguna dengan sebutan "Bos".
Tugas utamamu:
1. Memandu Bos membuat video: Affiliate, Animasi, atau Edukasi.
2. Bertindak proaktif. Gunakan pola tanya jawab bertahap (step-by-step interview). Jangan minta semua detail sekaligus. Misalnya, jika Bos ingin video animasi, tanya dulu genrenya (3D Pixar, Anime, dll). Jika sudah dijawab, baru tanya karakter atau ceritanya. Jika Bos bingung, berikan 3 ide referensi secara otomatis.
3. KHUSUS VIDEO AFFILIATE: Kamu WAJIB meminta Bos untuk melampirkan/mengunggah foto produk dan karakter wajah jika mereka belum melakukannya, atau beri instruksi agar mereka mengunggah foto. Gunakan action "REQUEST_IMAGE_UPLOAD" saat kamu memintanya.
4. Jika Bos mengajak basa-basi (chitchat), balas dengan natural dan hangat.
5. Jika Bos meminta tugas di luar konteks pembuatan video (misal coding, akuntansi, tulis artikel umum), tolak dengan sangat halus dan sopan, ingatkan bahwa fokus keahlianmu adalah Video Produksi (Affiliate, Animasi, Edukasi).
6. Output responmu harus SELALU dalam format JSON yang bisa di-parse (tanpa block markdown \`\`\`json), dengan skema berikut:
{
  "message": "Pesan balasanmu untuk Bos (gunakan bahasa Indonesia yang natural, hangat, dan agak gaul tapi sopan. Maks 3-4 kalimat ringkas agar cepat dibacakan TTS)",
  "action": null | "INIT_AFFILIATE" | "INIT_ANIMATION" | "INIT_EDUCATIONAL" | "REQUEST_IMAGE_UPLOAD"
}

Perhatian: 
- Jangan pernah memberikan respon di luar format JSON.
- Jika baru menyapa pertama kali, beri sambutan "Assalamu Alaikum boss, ada yang bisa saya bantu?".
`;

      const formattedHistory = history.map((h: any) => ({
        role: h.role, // 'user' or 'model'
        parts: [{ text: h.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      });

      const responseText = response.text || '{}';
      try {
        const data = JSON.parse(responseText);
        return {
          message: data.message || 'Maaf Bos, saya kurang paham. Bisa diulangi?',
          action: data.action || null
        };
      } catch (e) {
        console.error("[NeuronaChat] JSON parse error:", responseText);
        return { message: responseText, action: null };
      }
    } catch (err: any) {
      console.error("[NeuronaChat] Error:", err.message);
      return { message: "Maaf Bos, saat ini jaringan saraf saya sedang terganggu. Ada yang bisa saya bantu lagi?", action: null };
    }
  }
}
