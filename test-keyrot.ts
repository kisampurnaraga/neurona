import { keyRotator } from "./server/keyRotator";

process.env.GEMINI_API_KEYS = "key1,key2";

const k1 = keyRotator.getNextGeminiKey();
console.log("K1:", k1);
keyRotator.reportKeyError('gemini', k1!, new Error("HTTP 401 Unauthorized"));

const k2 = keyRotator.getNextGeminiKey();
console.log("K2:", k2);
keyRotator.reportKeyError('gemini', k2!, new Error("prepayment credits are depleted"));

const k3 = keyRotator.getNextGeminiKey();
console.log("K3:", k3);

console.log(keyRotator.getHealthReport().gemini);
