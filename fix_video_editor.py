import sys

with open('server/VideoEditor.ts', 'r') as f:
    content = f.read()

old_cmd = """const ffmpegCmd = `ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex "[0:v]subtitles=subs.srt:force_style='${style}'[v]" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -shortest "${finalVideoPath}"`;"""
new_cmd = """const ffmpegCmd = `ffmpeg -y -i concat.mp4 -i bgm.mp3 -filter_complex "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,subtitles=subs.srt:force_style='${style}'[v]" -map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -c:a aac -b:a 128k -shortest "${finalVideoPath}"`;"""

if old_cmd in content:
    content = content.replace(old_cmd, new_cmd)
    with open('server/VideoEditor.ts', 'w') as f:
        f.write(content)
    print("Fixed VideoEditor.ts")
else:
    print("Could not find old_cmd")

