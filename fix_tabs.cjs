const fs = require('fs');

let content = fs.readFileSync('src/components/FounderDashboard.tsx', 'utf8');

// First, fix the state type definition to include the missing tabs
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState\<'users' \| 'activation_form' \| 'stats'\>\('users'\);/,
  "const [activeTab, setActiveTab] = useState<'users' | 'activation_form' | 'stats' | 'payment' | 'inspector'>('users');"
);

// Second, add the tab buttons to the UI
const searchString = `          <button
            onClick={() => setActiveTab('activation_form')}
            className={\`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer \${
              activeTab === 'activation_form'
                ? 'border-amber-400 text-amber-300 font-bold bg-amber-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }\`}
          >
            <UserPlus size={15} />
            <span>+ Aktivasi Manual Pembeli WA</span>
          </button>`;

const newButtons = `          <button
            onClick={() => setActiveTab('payment')}
            className={\`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer \${
              activeTab === 'payment'
                ? 'border-indigo-400 text-indigo-300 font-bold bg-indigo-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }\`}
          >
            <Settings size={15} />
            <span>Rekening & WhatsApp</span>
          </button>
          
          <button
            onClick={() => setActiveTab('inspector')}
            className={\`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer \${
              activeTab === 'inspector'
                ? 'border-fuchsia-400 text-fuchsia-300 font-bold bg-fuchsia-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }\`}
          >
            <Film size={15} />
            <span>Video Inspector</span>
          </button>`;

content = content.replace(searchString, searchString + '\n\n' + newButtons);

// Make sure Settings and Film are imported if they aren't
if (!content.includes('Settings')) {
    content = content.replace(/import {([^}]+)} from 'lucide-react';/, "import { $1, Settings } from 'lucide-react';");
}
if (!content.includes('Film')) {
    content = content.replace(/import {([^}]+)} from 'lucide-react';/, "import { $1, Film } from 'lucide-react';");
}


fs.writeFileSync('src/components/FounderDashboard.tsx', content);
console.log('Fixed tabs in FounderDashboard');
