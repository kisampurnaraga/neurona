const fs = require('fs');

let path = 'src/components/AuthModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<\/form>\s*\)}/g, `</form>\n</div>\n          )}`);

// But since there's multiple, I only want to replace the first one!
// Let me just restore the first one manually.
c = fs.readFileSync(path, 'utf8');
let replaced = false;
c = c.replace(/<\/form>\s*\)}/g, (match) => {
  if (!replaced) {
    replaced = true;
    return `</form>\n</div>\n          )}`;
  }
  return match;
});

fs.writeFileSync(path, c);
