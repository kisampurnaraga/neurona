import sys

with open('src/server/providers/RunwayAdapter.ts', 'r') as f:
    content = f.read()

old_code = """           bodyData = {
              character_image: scene.imageUrl, // Face/Creator
              product_image: scene.assetUrl,   // Product
              product_info: prompt,            // Instructions
              seed: Math.floor(Math.random() * 1000000)
           };"""

new_code = """           bodyData = {
              characterImage: scene.imageUrl, // Face/Creator
              productImage: scene.assetUrl,   // Product
              productInfo: prompt,            // Instructions
              seed: Math.floor(Math.random() * 1000000)
           };"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/server/providers/RunwayAdapter.ts', 'w') as f:
        f.write(content)
    print("Patched UGC recipe parameters successfully.")
else:
    print("Could not find old_code in RunwayAdapter.ts")

