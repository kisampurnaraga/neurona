import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace('url: imgUrl,', 'url: imgUrl,\n                filename: imgUrl.split(\'/\').pop(),');
content = content.replace('url: vidUrl,', 'url: vidUrl,\n                filename: vidUrl.split(\'/\').pop(),');
content = content.replace('url: p.finalVideoUrl,', 'url: p.finalVideoUrl,\n            filename: p.finalVideoUrl.split(\'/\').pop(),');
content = content.replace('url: p.masterCharacterImageUrl,', 'url: p.masterCharacterImageUrl,\n            filename: p.masterCharacterImageUrl.split(\'/\').pop(),');
content = content.replace('url: p.masterProductImageUrl,', 'url: p.masterProductImageUrl,\n            filename: p.masterProductImageUrl.split(\'/\').pop(),');

content = content.replace('url: url,', 'url: url,\n                    filename: url.split(\'/\').pop(),');

fs.writeFileSync('server.ts', content);
