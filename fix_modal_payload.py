import sys

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    content = f.read()

old_payload = """      const videoUrls = project.scenes.map(s => s.videoUrl).filter(Boolean);
      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls })
      });"""

new_payload = """      const scenesPayload = project.scenes
        .filter(s => s.videoStatus === 'COMPLETED' && s.videoUrl)
        .map(s => ({
          url: s.videoUrl,
          text: s.subtitle || s.voiceOver || s.textOverlay || s.dialogue || ''
        }));

      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: scenesPayload })
      });"""

if old_payload in content:
    content = content.replace(old_payload, new_payload)
    with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
        f.write(content)
    print("Updated Modal Payload")
else:
    print("Could not find Modal Payload")
