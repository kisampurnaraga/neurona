import sys
import re

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r"const videoUrls = project\.scenes\.map\(s => s\.videoUrl\)\.filter\(Boolean\);\s*const res = await fetch\('/api/stitch', {\s*method: 'POST',\s*headers: { 'Content-Type': 'application/json' },\s*body: JSON\.stringify\({ videoUrls }\)\s*}\);")

new_payload = """const scenesPayload = project.scenes
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

content = pattern.sub(new_payload, content)
with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
    f.write(content)
print("Regex replace done")
