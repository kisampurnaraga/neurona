import sys

with open('src/server/providers/RunwayAdapter.ts', 'r') as f:
    content = f.read()

old_polling = """          // Poll for task completion (up to 30 seconds)
          for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`${baseUrl}/tasks/${taskId}`, {"""

new_polling = """          // Poll for task completion (up to 3 minutes for video generation)
          for (let i = 0; i < 45; i++) {
            await new Promise(r => setTimeout(r, 4000));
            const statusRes = await fetch(`${baseUrl}/tasks/${taskId}`, {"""

if old_polling in content:
    content = content.replace(old_polling, new_polling)
    with open('src/server/providers/RunwayAdapter.ts', 'w') as f:
        f.write(content)
    print("Polling duration increased.")
else:
    print("Could not find old_polling in RunwayAdapter.ts")

