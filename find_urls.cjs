const fs = require('fs');
const c = fs.readFileSync('projects.json', 'utf8');
const urls = c.match(/https?:\/\/[^\s"'\\]+/g) || [];
console.log("Total URLs found:", urls.length);
const unique = [...new Set(urls)];
unique.forEach(u => console.log("URL:", u));
