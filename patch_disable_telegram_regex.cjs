const fs = require('fs');

let path = 'src/components/CreditTopUpModal.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\{\/\* ⚡ RECOMMENDED FAST CONFIRMATION \(TELEGRAM BOT\) \*\/\}/g, '');
  content = content.replace(/\{\/\* Telegram Button \(Recommended\) \*\/\}/g, '');
  content = content.replace(/<a[\s\S]*?href=\{getTelegramUrl\(\)\}[\s\S]*?<\/a>/g, '');
  // also remove the text mentioning telegram
  content = content.replace(/<div className="mt-4 p-3 rounded-xl bg-sky-500\/10 border border-sky-500\/20 text-xs text-sky-200">[\s\S]*?<\/div>/g, '');
  fs.writeFileSync(path, content);
}

path = 'src/components/AuthModal.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\{\/\* Telegram Bot \(Recommended\) - Coming Soon \*\/\}/g, '');
  content = content.replace(/<button[\s\S]*?Reset via Telegram Bot[\s\S]*?<\/button>/g, '');
  fs.writeFileSync(path, content);
}
