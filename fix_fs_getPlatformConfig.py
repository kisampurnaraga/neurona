import sys

with open('src/server/fcc/FounderService.ts', 'r') as f:
    content = f.read()

content = content.replace("imageEngine: this.customGptImage2Config.engine,", "imageEngine: this.customGptImage2Config.engine,\n      llmEngine: this.llmEngine,")

with open('src/server/fcc/FounderService.ts', 'w') as f:
    f.write(content)
print("Added llmEngine to getPlatformConfig")
