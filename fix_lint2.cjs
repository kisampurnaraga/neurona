const fs = require('fs');

// Fix GalleryModal proj reference
let galleryPath = 'src/components/GalleryModal.tsx';
let galleryContent = fs.readFileSync(galleryPath, 'utf8');
galleryContent = galleryContent.replace(
  /getProjectAspectRatioClass\(p\)/g, 
  "getProjectAspectRatioClass(proj)"
);
fs.writeFileSync(galleryPath, galleryContent);

// Fix AffiliateConfigModal Film icon
let affiliatePath = 'src/components/AffiliateConfigModal.tsx';
let affiliateContent = fs.readFileSync(affiliatePath, 'utf8');
affiliateContent = affiliateContent.replace(
  /\} from 'lucide-react';/, 
  "  Film,\n} from 'lucide-react';"
);
fs.writeFileSync(affiliatePath, affiliateContent);


// Fix StoryboardMatrixModal Plus icon
let sbPath = 'src/components/StoryboardMatrixModal.tsx';
let sbContent = fs.readFileSync(sbPath, 'utf8');
sbContent = sbContent.replace(
  /\} from 'lucide-react';/, 
  "  Plus,\n} from 'lucide-react';"
);
fs.writeFileSync(sbPath, sbContent);

