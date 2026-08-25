import sys

with open('src/server/fcc/FounderService.ts', 'r') as f:
    content = f.read()

content = content.replace("export class FounderService {\n", "export class FounderService {\n  private static llmEngine: LlmEngineOption = 'gemini';\n")

with open('src/server/fcc/FounderService.ts', 'w') as f:
    f.write(content)
print("Added static llmEngine to FounderService")
