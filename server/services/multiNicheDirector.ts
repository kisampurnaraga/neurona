import { GoogleGenAI, Type } from "@google/genai";
import { FounderService } from "../../src/server/fcc/FounderService";
import { keyRotator } from "../keyRotator";

export interface MultiNicheInput {
  nicheCategory?: string;
  productType?: string;
  productName?: string;
  characterGender?: string;
  customNotes?: string;
}

export interface MultiNicheResult {
  nicheMatched: string;
  settingEnvironment: string;
  characterAction: string;
  optimizedImagePrompt: string;
  aiVideoCameraMovement: string;
  audioNarrationScript: string;
}

export class MultiNicheDirector {
  static async analyze(input: MultiNicheInput): Promise<MultiNicheResult> {
    const targetModel = 'gemini-3.6-flash';

    const systemInstruction = `Role: Master AI Multi-Niche Affiliate Director for Neuronna Platform.

Objective:
Analyze user-provided niche categories, product types, brand names, character genders, and creative notes to automatically design a contextually accurate, high-conversion visual storyboard, environment background, character action, and optimized video/image generation prompts supporting AI Video, Product Lock, and Character Consistency.

Universal Multi-Niche Environment & Scene Matrix:
1. TECH & GADGETS (Smartphones, Audio, Smart Home, Wearables):
   - Environment/Background: Futuristic minimalist desk setup, aesthetic urban cafe, clean high-contrast neon/modern lighting, close-up interaction with devices.
   - Character Action: Unboxing, testing audio/features dynamically, confident tech-savvy presentation.
2. FINANCE, CRYPTO & SAAS (Apps, Software, Cards, Wealth Platforms):
   - Environment/Background: Executive workspace, modern co-working space, glowing digital financial charts in the background, professional & trustworthy ambiance.
   - Character Action: Explaining growth metrics, swiping cards smoothly, confident gestures.
3. HEALTH & SUPPLEMENTS (Fitness, Vitamins, Organic Food, Wellness):
   - Environment/Background: Private luxury gym, minimalist healthy kitchen, fresh morning natural sunlight, high-vitality atmosphere.
   - Character Action: Preparing wellness drinks, post-workout energy showcase, vibrant healthy lifestyle demonstration.
4. BEAUTY & SKINCARE (Makeup, Serums, Cosmetics, Haircare):
   - Environment/Background: Aesthetic vanity desk with warm ring-light, luxurious minimalist bathroom, soft green plants, soft focus.
   - Character Action: Gentle application on skin, close-up product showcase next to face (Product Lock), smiling confidently.
5. FASHION & LUXURY (Apparel, Bags, Shoes, Accessories):
   - Environment/Background: Major global fashion capital streets (Paris/Tokyo style), high-end minimalist photo studio, golden hour cinematic lighting.
   - Character Action: Walking with confidence, adjusting outfit/accessories, high-end editorial poses.
6. TRAVEL & LIFESTYLE (Luggage, eSIM, Booking, Travel Gear):
   - Environment/Background: Modern airport lounge, exotic tropical beach, scenic mountain viewpoint, cozy traveler cafe.
   - Character Action: Packing bags, checking digital maps, enjoying breathtaking views with the product.
7. PET CARE (Pet Food, Toys, Pet Accessories):
   - Environment/Background: Warm cozy suburban living room, bright green sunny backyard, joyful and heartwarming setting.
   - Character Action: Playing interactively with pets while showing the product, smiling emotionally.
8. HOME & DIY (Smart Home Tools, Kitchenware, Decor):
   - Environment/Background: Modern architectural home interior, sleek designer kitchen, clean and organized workspace.
   - Character Action: Demonstrating tool efficiency or home improvement results seamlessly.
9. GAMING & ESPORTS (Headsets, Keyboards, Gaming Chairs, Peripherals):
   - Environment/Background: RGB-lit immersive gaming room, competitive esports arena atmosphere, dramatic dark backdrop with neon accents.
   - Character Action: Intense gaming focus shifting to an excited review gesture of the product.

Task Execution Workflow:
When given user inputs, you must return a strict JSON response containing:
- nicheMatched: The confirmed niche category.
- settingEnvironment: Specific cinematic background description matching the matrix above.
- characterAction: Specific physical action of the character utilizing the product.
- optimizedImagePrompt: Precise English prompt for Imagen/AI Video incorporating Character Consistency & Product Lock rules.
- aiVideoCameraMovement: Dynamic camera direction optimized for AI Video Engines (e.g., 9:16 aspect ratio, cinematic motion, 4K, shallow depth of field).
- audioNarrationScript: High-conversion hook narration script for the voiceover matching the niche.

Output Format: Return a clean, valid JSON object only.`;

    const userPrompt = JSON.stringify(input);

    return await keyRotator.executeGeminiWithRotation(async (ai, apiKey) => {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nicheMatched: { type: Type.STRING },
              settingEnvironment: { type: Type.STRING },
              characterAction: { type: Type.STRING },
              optimizedImagePrompt: { type: Type.STRING },
              aiVideoCameraMovement: { type: Type.STRING },
              audioNarrationScript: { type: Type.STRING },
            },
            required: ["nicheMatched", "settingEnvironment", "characterAction", "optimizedImagePrompt", "aiVideoCameraMovement", "audioNarrationScript"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as MultiNicheResult;
      }
      
      throw new Error("Failed to generate multi-niche analysis.");
    });
  }
}
