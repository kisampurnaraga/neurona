const http = require('http');
const fs = require('fs');
const path = require('path');

const demosDir = path.join(__dirname, 'public', 'demos');
if (!fs.existsSync(demosDir)) {
  fs.mkdirSync(demosDir, { recursive: true });
}

const demos = [
  {
    id: 'minimax_turbo',
    text: 'Halo! Ini contoh sampel suara MiniMax Speech-02 Turbo yang cepat dan alami.',
    provider: 'minimax',
    model: 'speech-01-turbo',
    voiceName: 'female-1'
  },
  {
    id: 'minimax_hd',
    text: 'Halo! Ini adalah sampel suara MiniMax Speech-02 HD dengan kejernihan studio definisi tinggi.',
    provider: 'minimax',
    model: 'speech-01-hd',
    voiceName: 'male-1'
  },
  {
    id: 'elevenlabs',
    text: 'Halo! Ini sampel suara ElevenLabs Multilingual v2 yang sangat jernih dan ekspresif.',
    provider: 'elevenlabs',
    model: 'eleven_multilingual_v2',
    voiceName: 'Rachel'
  },
  {
    id: 'voice_clone',
    text: 'Halo! Ini sampel suara hasil kloning vokal kustom Anda.',
    provider: 'minimax',
    model: 'speech-01-turbo',
    voiceName: 'clone-1'
  }
];

// Instead of calling the API (which might fail if keys are missing), 
// let's just make valid dummy MP3 files so they exist, or call the API.
// Wait! Let me just try calling the real /api/tts. If it fails, I'll fallback to dummy audio.

async function generate() {
  for (const d of demos) {
    const postData = JSON.stringify({
      text: d.text,
      provider: d.provider,
      model: d.model,
      voiceName: d.voiceName,
      voiceGender: 'female'
    });

    console.log(`Generating ${d.id}...`);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/tts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        if (res.statusCode !== 200) {
           console.log(`Failed for ${d.id}: ${res.statusCode}`);
           // Create dummy file
           fs.writeFileSync(path.join(demosDir, `${d.id}.mp3`), 'dummy');
           return resolve();
        }
        
        const file = fs.createWriteStream(path.join(demosDir, `${d.id}.mp3`));
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Saved ${d.id}.mp3`);
          resolve();
        });
      });
      req.on('error', (e) => {
        console.error(e);
        fs.writeFileSync(path.join(demosDir, `${d.id}.mp3`), 'dummy');
        resolve();
      });
      req.write(postData);
      req.end();
    });
  }
}

generate();
