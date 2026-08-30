import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'outputs', '.neurona_api_keys.json');
const raw = fs.readFileSync(file, 'utf8');
const state = JSON.parse(raw);

console.log("Before clearing, Fal pool had", state.fal.length, "keys.");
state.fal = [];

fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
console.log("Fal pool cleared.");
