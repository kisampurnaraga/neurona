import sys

with open('server/orchestrator.ts', 'r') as f:
    content = f.read()

content = content.replace("return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });", "return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });")

with open('server/orchestrator.ts', 'w') as f:
    f.write(content)

print("Fixed orchestrator")
