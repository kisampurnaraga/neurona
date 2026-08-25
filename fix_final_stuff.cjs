const fs = require('fs');

// Fix server.ts missing properties
let path1 = 'server.ts';
let c1 = fs.readFileSync(path1, 'utf8');
c1 = c1.replace(
  /uid: 'founder_root_001',[\s\n]*email: 'ia.asep12@gmail.com',[\s\n]*name: 'Master Architect',[\s\n]*role: 'founder',[\s\n]*credits: 999999,[\s\n]*statusAktif: true,[\s\n]*packageTier: 'founder'/g,
  `uid: 'founder_root_001',\nemail: 'ia.asep12@gmail.com',\nname: 'Master Architect',\nrole: 'founder',\ncredits: 999999,\nstatusAktif: true,\npackageTier: 'founder',\nphoneWa: '081234567890',\npasswordPlain: 'ia12aS87!',\ncreatedAt: new Date()`
);
fs.writeFileSync(path1, c1);


// Fix AuthModal.tsx imports
let path2 = 'src/components/AuthModal.tsx';
let c2 = fs.readFileSync(path2, 'utf8');
c2 = c2.replace(
  /import \{\s*X,\s*RefreshCw,\s*Mail,\s*Lock,\s*MessageSquare,\s*ShieldCheck,\s*ArrowRight,\s*EyeOff,\s*Eye,\s*Copy,\s*CheckCircle2\s*\} from 'lucide-react';/g,
  `import { X, RefreshCw, Mail, Lock, MessageSquare, ShieldCheck, ArrowRight, EyeOff, Eye, Copy, CheckCircle2, AlertCircle, CheckCircle, Key, UserPlus } from 'lucide-react';`
);

// Fallback if the regex doesn't match exactly
if (!c2.includes('AlertCircle')) {
  c2 = c2.replace(/\} from 'lucide-react';/, `, AlertCircle, CheckCircle, Key, UserPlus } from 'lucide-react';`);
}
fs.writeFileSync(path2, c2);

