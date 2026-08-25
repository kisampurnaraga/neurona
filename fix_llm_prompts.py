import sys

with open('server/llmService.ts', 'r') as f:
    content = f.read()

# Enhance the Affiliate / Commercial prompts for maximum consistency
old_commercial_rules = """2. NO Text in Generations: DO NOT ask the image generator ('promptTextToImage') or video generator ('promptImageToVideo') to include text, typography, discount labels, or graphics (like 'SALE', '50% OFF'). Text generation looks like gibberish.
3. UGC Video Recipe: 'promptImageToVideo' MUST ONLY describe camera movement and physical subject motion. For product scenes, use UGC style: 'Character holding the product close to the camera, speaking naturally, highly realistic.'"""

new_commercial_rules = """2. NO Text in Generations: DO NOT ask the image generator ('promptTextToImage') or video generator ('promptImageToVideo') to include text, typography, discount labels, or graphics.
3. ABSOLUTE CONSISTENCY (CRITICAL): You MUST repeat the EXACT same physical description of the character (e.g., "25yo Indonesian woman, short bob hair, yellow jacket") and the EXACT product description in EVERY SINGLE 'promptTextToImage' across all 4 scenes. Do not change their clothes or face!
4. UGC Video Recipe: 'promptImageToVideo' MUST ONLY describe camera movement and physical subject motion. (e.g. "Slow pan, character holding the product close to the camera, speaking naturally, highly realistic, 4k")."""

if old_commercial_rules in content:
    content = content.replace(old_commercial_rules, new_commercial_rules)

old_character_profile = "You output JSON with 'characterProfile' (the creator persona with consistent styling)"
new_character_profile = "You output JSON with 'characterProfile' (the creator persona with highly detailed consistent styling, age, ethnicity, hair, clothing)"

if old_character_profile in content:
    content = content.replace(old_character_profile, new_character_profile)

with open('server/llmService.ts', 'w') as f:
    f.write(content)

print("LLM Service Prompts Updated.")
