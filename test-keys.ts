import { keyRotator } from "./server/keyRotator";

process.env.GEMINI_API_KEYS = "key1, key2 ,key1";
process.env.GEMINI_API_KEY = "key1 ";

keyRotator.reloadKeysFromEnv();
console.log(keyRotator.getHealthReport().gemini);
