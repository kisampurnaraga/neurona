const fs = require('fs');

let path = 'src/components/AuthModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/<\/form>\n\s*<\/div>\n\s*\)}/g, `</form>\n          )}`);

c = c.replace(/<\/form>\s*<\/div>\s*\)}\s*<\/div>\s*<\/motion\.div>\s*<\/div>\s*\);\s*\};\s*$/g, `</form>\n          )}\n        </div>\n      </motion.div>\n    </div>\n  );\n};\n`);
fs.writeFileSync(path, c);
