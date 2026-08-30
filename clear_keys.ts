import fs from 'fs';
const state = {
  gemini: [],
  veo: [],
  openai: [],
  fal: []
};
fs.writeFileSync('.neurona_api_keys.json', JSON.stringify(state, null, 2), 'utf8');
console.log("Cleared keys");
