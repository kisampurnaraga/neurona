const fs = require('fs');

let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

// The prop is now handleOpenStoryboard in destructuring
content = content.replace(
  '  handleOpenStoryboard,',
  '  onOpenStoryboard,'
);
// And in the handleOpenStoryboard function itself:
// const handleOpenStoryboard = () => {
//    setHasDismissedBanner(true);
//    setShowReadyBanner(false);
//    handleOpenStoryboard(); <-- infinite loop!
//  };
content = content.replace(
  '    handleOpenStoryboard();\n  };\n\n  // Determine active production phase',
  '    onOpenStoryboard();\n  };\n\n  // Determine active production phase'
);

fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', content);
