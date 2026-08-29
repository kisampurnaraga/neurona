import sys

with open('server/neuronaChatService.ts', 'r') as f:
    content = f.read()

content = content.replace("model: 'gemini-2.5-flash',", "model: 'gemini-2.5-flash',")

with open('server/neuronaChatService.ts', 'w') as f:
    f.write(content)

print("Fixed chat service model")
