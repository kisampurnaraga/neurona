import sys

with open('server/VideoEditor.ts', 'r') as f:
    content = f.read()

bgm_old = """      const bgmPromise = (async () => {
         const bgmPath = path.join(tempDir, 'bgm.mp3');
         try {
            const bgmRes = await fetch('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
            const bgmBuf = await bgmRes.arrayBuffer();
            fs.writeFileSync(bgmPath, Buffer.from(bgmBuf));
         } catch(e) {
            console.warn("[VideoEditor] Gagal unduh BGM, membuat audio sunyi fallback...");
            await execAsync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 300 "bgm.mp3"`, { cwd: tempDir });
         }
      })();"""

bgm_new = """      const bgmPromise = (async () => {
         const bgmPath = path.join(tempDir, 'bgm.mp3');
         try {
            const freeMusicLibrary = [
               'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
               'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
               'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
               'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
            ];
            const randomBgm = freeMusicLibrary[Math.floor(Math.random() * freeMusicLibrary.length)];
            console.log(`[VideoEditor] Memilih BGM: ${randomBgm}`);
            const bgmRes = await fetch(randomBgm);
            if (!bgmRes.ok) throw new Error("Gagal mengunduh lagu");
            const bgmBuf = await bgmRes.arrayBuffer();
            fs.writeFileSync(bgmPath, Buffer.from(bgmBuf));
         } catch(e) {
            console.warn("[VideoEditor] Gagal unduh BGM, membuat audio sunyi fallback...", e);
            await execAsync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 300 "bgm.mp3"`, { cwd: tempDir });
         }
      })();"""

content = content.replace(bgm_old, bgm_new)

with open('server/VideoEditor.ts', 'w') as f:
    f.write(content)

print("VideoEditor BGM updated")
