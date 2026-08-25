import sys

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    content = f.read()

old = """      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: scenesPayload })
      });"""

new = """      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, scenes: scenesPayload })
      });"""

if old in content:
    content = content.replace(old, new)
    with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
        f.write(content)
    print("Fixed UI fetch")
else:
    print("Failed to find UI fetch")

