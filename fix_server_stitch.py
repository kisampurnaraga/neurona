import sys
import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = re.compile(r"const \{ videoUrls \} = req\.body;\s*if \(\!videoUrls \|\| \!Array\.isArray\(videoUrls\)\) \{\s*return res\.status\(400\)\.json\(\{ error: 'videoUrls array is required\.' \}\);\s*\}\s*console\.log\(`\[Stitcher API\] Received request to stitch \$\{videoUrls\.length\} videos`\);\s*const finalUrl = await StitcherAgent\.stitchVideos\(videoUrls\);")

new_payload = """const scenes = req.body.scenes || (req.body.videoUrls ? req.body.videoUrls.map((url: string) => ({ url, text: '' })) : null);
      if (!scenes || !Array.isArray(scenes)) {
        return res.status(400).json({ error: 'scenes array is required.' });
      }
      
      console.log(`[Stitcher API] Received request to stitch ${scenes.length} videos`);
      const finalUrl = await StitcherAgent.stitchVideos(scenes);"""

content = pattern.sub(new_payload, content)
with open('server.ts', 'w') as f:
    f.write(content)
print("Regex replace server done")
