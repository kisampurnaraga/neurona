import sys
import re

with open('src/components/StoryboardMatrixModal.tsx', 'r') as f:
    content = f.read()

# Add stitch button near "Full Video Render" or "Download All"
# First add state
state_code = """  const [copiedType, setCopiedType] = useState<'ALL_PROMPTS' | 'ALL_SCRIPT' | null>(null);
  const [isStitching, setIsStitching] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  const allVideosCompleted = project?.scenes?.every(s => s.videoStatus === 'COMPLETED' && s.videoUrl) || false;

  const handleStitchVideos = async () => {
    if (!project || !project.scenes) return;
    setIsStitching(true);
    try {
      const videoUrls = project.scenes.map(s => s.videoUrl).filter(Boolean);
      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls })
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
content = content.replace("const [copiedType, setCopiedType] = useState<'ALL_PROMPTS' | 'ALL_SCRIPT' | null>(null);", state_code)

# Now add the button in the UI
button_ui = """
            {/* Stitch Button */}
            {allVideosCompleted && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleStitchVideos}
                  disabled={isStitching}
                  className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isStitching ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                  <span>{isStitching ? 'Menyatukan Video...' : 'Render Final Movie'}</span>
                </button>
                {finalVideoUrl && (
                  <a href={finalVideoUrl} target="_blank" rel="noreferrer" className="w-full px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[11px] text-center transition border border-emerald-500/30">
                    📥 Download Final Movie
                  </a>
                )}
              </div>
            )}
"""

content = content.replace("{isAwaiting && (", button_ui + "\n            {isAwaiting && (")

with open('src/components/StoryboardMatrixModal.tsx', 'w') as f:
    f.write(content)
print("Updated Modal")
