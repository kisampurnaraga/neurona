const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const importBlock = `import founderPaymentRouter from "./server/routes/founderPayment";

// === INJECT FFMPEG-STATIC INTO GLOBAL PATH ===
import ffmpegStatic from 'ffmpeg-static';
if (ffmpegStatic) {
  process.env.FFMPEG_PATH = ffmpegStatic;
  const ffmpegDir = path.dirname(ffmpegStatic);
  process.env.PATH = \`\${ffmpegDir}:\${process.env.PATH}\`;
  console.log('[SYSTEM] ffmpeg-static globally loaded and added to PATH at:', ffmpegStatic);
}
// =============================================
`;

code = code.replace(/import founderPaymentRouter from "\.\/server\/routes\/founderPayment";/, importBlock);

fs.writeFileSync('server.ts', code);
console.log('SUCCESS');
