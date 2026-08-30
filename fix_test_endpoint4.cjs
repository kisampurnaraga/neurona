const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace('"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/1200px-Image_created_with_a_mobile_phone.png"', '"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbeaEAAAAAElFTkSuQmCC"');

fs.writeFileSync('server.ts', content);
