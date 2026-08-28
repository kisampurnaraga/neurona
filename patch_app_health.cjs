const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `          {/* Credit Top-Up Modal */}`;
const replaceStr = `          {/* System Health Dashboard */}
          {isSystemHealthOpen && (
            <SystemHealthDashboard onClose={() => setIsSystemHealthOpen(false)} />
          )}

          {/* Credit Top-Up Modal */}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched App.tsx for SystemHealthDashboard component rendering');
} else {
  console.log('Target string not found');
}
