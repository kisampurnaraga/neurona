const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace('"https://images.unsplash.com/photo-1542273917363-3b1817f69a5d?q=80&w=1024&auto=format&fit=crop"', '"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/1200px-Image_created_with_a_mobile_phone.png"');

fs.writeFileSync('server.ts', content);
