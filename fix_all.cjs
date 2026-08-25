const fs = require('fs');

let path1 = 'src/components/AuthModal.tsx';
let c1 = fs.readFileSync(path1, 'utf8');

c1 = c1.replace(
  /{[\s\n]*\/\* Already active login button \*\/}/, 
  `</div>\n{/* Already active login button */}`
);
fs.writeFileSync(path1, c1);


let path2 = 'src/components/CreditTopUpModal.tsx';
let c2 = fs.readFileSync(path2, 'utf8');

// replace the broken p tag and div that I left empty
c2 = c2.replace(/<p className="text-\[11px\] text-gray-300 leading-relaxed">[\s\n]*<\/p>[\s\n]*<div className="flex flex-col sm:flex-row gap-2\.5 pt-1">/g, 
  `<div className="flex flex-col sm:flex-row gap-2.5 pt-1">`);

fs.writeFileSync(path2, c2);
