const fs = require('fs');
const path = require('path');

let imageUrl = '/api/images/test.png';
if (imageUrl.startsWith('/api/images/')) {
    const filename = imageUrl.split('/').pop();
    const filepath = path.join(process.cwd(), 'public', 'images', filename);
    console.log("Local path:", filepath);
}
