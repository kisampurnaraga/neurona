const fs = require('fs');

let path = 'src/components/CreditTopUpModal.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/Jika Anda ingin proses penambahan kredit <strong>lebih cepat dan otomatis<\/strong> tanpa menunggu balasan admin yang sibuk, klik tombol <strong>Konfirmasi via Telegram<\/strong>./g, '');
  content = content.replace(/<div className="p-3\.5 rounded-xl bg-sky-950\/40 border border-sky-500\/40 space-y-2">[\s\S]*?<\/div>/g, '');
  fs.writeFileSync(path, content);
}

path = 'src/components/AuthModal.tsx';
if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/<button[\s\S]*?Telegram \(Segera\)[\s\S]*?<\/button>/g, '');
  fs.writeFileSync(path, content);
}
