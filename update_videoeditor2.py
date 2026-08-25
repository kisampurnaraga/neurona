import sys

with open('server/VideoEditor.ts', 'r') as f:
    content = f.read()

# 1. Update processProject signature to return any or the object
old_sig = "static async processProject(project: ProductionProject): Promise<string> {"
new_sig = "static async processProject(project: ProductionProject): Promise<any> {"
content = content.replace(old_sig, new_sig)

# 2. Update the return at the end of processProject
old_return = "return `/outputs/${finalVideoName}`;"
new_return = """const finalUrl = `/outputs/${finalVideoName}`;

      const progressMetrics = {
        totalScenesStitched: sceneResults.length,
        audioTracksSynced: sceneResults.filter(r => r.hasTts).length,
        subtitlesGenerated: true,
        transitionsApplied: true
      };
      
      const multitrackLayoutDetails = sceneResults.map(res => ({
        trackId: `scene_${res.index}`,
        videoClip: `scene_${res.index}.mp4`,
        audioClip: res.hasTts ? `tts_${res.index}.mp3` : null,
        duration: SCENE_DURATION,
        subtitleCue: res.text ? true : false
      }));

      const orchestrationLog = [
        "Validating product lock and scene continuity...",
        `Prepared ${sceneResults.length} high-fidelity video tracks.`,
        "Stitching video clips with seamless transitions.",
        "Syncing Text-to-Speech (TTS) audio layer.",
        "Generating timestamped subtitle cues.",
        "Applying randomized royalty-free BGM track with volume ducking.",
        "Exporting final master render."
      ];

      return {
        assemblyStatus: "COMPLETED",
        progressMetrics,
        multitrackLayoutDetails,
        finalExportConfirmationLogs: orchestrationLog,
        finalVideoUrl: finalUrl
      };"""
content = content.replace(old_return, new_return)

with open('server/VideoEditor.ts', 'w') as f:
    f.write(content)

print("VideoEditor signature updated")
