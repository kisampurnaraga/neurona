import sys

with open('server/imageService.ts', 'r') as f:
    content = f.read()

# Replace the broken block
old_block = """  }

  /**
   * async generateKeyframeImage"""

new_block = """  }

  /**
   * Generates a genuine AI keyframe image tailored to the scene's prompt, product context & character.
   * Supports ChatGPT Image 2 (DALL-E 3) / Google Imagen 3 / Flux AI Real Diffusion Engine.
   */
  static async generateKeyframeImage"""

content = content.replace(old_block, new_block)

with open('server/imageService.ts', 'w') as f:
    f.write(content)

print("Syntax fixed")
