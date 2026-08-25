import sys

with open('src/server/core/StitcherAgent.ts', 'r') as f:
    content = f.read()

content = content.replace("path.join(process.cwd(), 'dist', 'output')", "path.join(process.cwd(), 'outputs')")
content = content.replace("resolve(`/output/${outputFilename}`);", "resolve(`/outputs/${outputFilename}`);")

with open('src/server/core/StitcherAgent.ts', 'w') as f:
    f.write(content)
print("Updated output path to outputs/")
