const fs = require('fs');
let content = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

// Find the </section> right before the Showcase
content = content.replace(/<\/section>\s*\{\/\* INTERACTIVE STUDIO PREVIEW SHOWCASE \*\/\}/g, '{/* INTERACTIVE STUDIO PREVIEW SHOWCASE */}');

fs.writeFileSync('src/components/LandingPage.tsx', content);
console.log('Fixed syntax in LandingPage');
