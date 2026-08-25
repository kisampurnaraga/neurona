import sys

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    content = f.read()

target = "const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);"
new_code = target + """
  const [isStitching, setIsStitching] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  const allVideosCompleted = project?.scenes?.every(s => s.videoStatus === 'COMPLETED' && s.videoUrl) || false;

  const handleStitchVideos = async () => {
    if (!project || !project.scenes) return;
    setIsStitching(true);
    try {
      const scenesPayload = project.scenes
        .filter(s => s.videoStatus === 'COMPLETED' && s.videoUrl)
        .map(s => ({
          url: s.videoUrl,
          text: s.subtitle || s.voiceOver || s.textOverlay || s.dialogue || ''
        }));

      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: scenesPayload })
      });
      const data = await res.json();
      if (data.success) {
        setFinalVideoUrl(data.url);
      } else {
        alert('Stitching failed: ' + data.error);
      }
    } catch (e: any) {
      alert('Error calling stitch API: ' + e.message);
    } finally {
      setIsStitching(false);
    }
  };
"""

content = content.replace(target, new_code)

with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
    f.write(content)

print("Fixed variables")
