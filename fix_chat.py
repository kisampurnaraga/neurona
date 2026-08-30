import sys

with open('server/neuronaChatService.ts', 'r') as f:
    content = f.read()

content = content.replace("model: 'gemini-3.6-flash',", "model: 'gemini-3.6-flash',")

with open('server/neuronaChatService.ts', 'w') as f:
    f.write(content)

print("Fixed chat service model")
