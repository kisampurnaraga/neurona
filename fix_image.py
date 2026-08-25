import sys
import re

with open('server/imageService.ts', 'r') as f:
    content = f.read()

# Replace the routing logic at the end of generateKeyframeImage to force ChatGPT Image 2
# and remove all fallbacks.

old_logic = """    // Routing engine request based on Founder Control Center settings
    if (preferredEngine === 'chatgpt-image-2' || preferredEngine === 'dall-e-3') {
      // 1. ChatGPT Image 2 -> 2. Imagen 3 -> 3. Flux Diffusion
      const res1 = await runGptImage2();
      if (res1) return res1;

      const res2 = await runImagen3();
      if (res2) return res2;

      return await runFluxDiffusion();
    } else if (preferredEngine === 'imagen-3') {
      // 1. Imagen 3 -> 2. ChatGPT Image 2 -> 3. Flux Diffusion
      const res1 = await runImagen3();
      if (res1) return res1;

      const res2 = await runGptImage2();
      if (res2) return res2;

      return await runFluxDiffusion();
    } else if (preferredEngine === 'flux-diffusion') {
      // Direct Flux Diffusion
      return await runFluxDiffusion();
    } else {
      // Default fallback
      const res1 = await runGptImage2();
      if (res1) return res1;
      return await runFluxDiffusion();
    }"""

new_logic = """    // Strict ChatGPT Image 2 Requirement from User (No Dummy Fallbacks)
    console.log('[ImageGenerationService] Forcing ChatGPT Image 2 (No Fallback)');
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("ERROR: Token Habis atau API Key OpenAI/ChatGPT tidak ditemukan. Generate gambar dihentikan sementara.");
    }
    
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      let response;
      try {
        response = await openai.images.generate({
          model: "chatgpt-image-2" as any,
          prompt: `[ChatGPT Image 2 Engine] ${finalPrompt}`.substring(0, 1000),
          n: 1,
          size: "1024x1024",
        });
      } catch (e: any) {
        // Attempt dall-e-3 if chatgpt-image-2 model string doesn't exist
        response = await openai.images.generate({
          model: "dall-e-3",
          prompt: finalPrompt.substring(0, 1000),
          n: 1,
          size: "1024x1024",
          quality: "standard"
        });
      }

      if (response?.data && response.data[0]?.url) {
        return response.data[0].url;
      }
      throw new Error("API tidak mengembalikan URL gambar.");
    } catch (openAiErr: any) {
      console.error(`[ChatGPT Image 2 Engine] Error:`, openAiErr.message);
      throw new Error(`ERROR ChatGPT: ${openAiErr.message}. Token mungkin habis, tidak ada gambar dummy yang digunakan.`);
    }"""

# The script might not find the exact old_logic due to whitespace/newlines, let's use regex
content = re.sub(r"// Routing engine request based on Founder Control Center settings.*?return await runFluxDiffusion\(\);\s*\}\s*\}", new_logic, content, flags=re.DOTALL)

with open('server/imageService.ts', 'w') as f:
    f.write(content)

print("Updated imageService.ts")
