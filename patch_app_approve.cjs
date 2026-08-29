const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "            onApproveAndPay={(cost, subtitleStyle) => {\n              setIsStoryboardMatrixOpen(false);\n              handleApprove(subtitleStyle);\n            }}",
  "            onApproveAndPay={(cost, subtitleStyle) => {\n              setIsStoryboardMatrixOpen(false);\n              if (subtitleStyle) {\n                handleApprove(subtitleStyle);\n              } else {\n                setShowCaptionModal(true);\n              }\n            }}"
);

fs.writeFileSync('src/App.tsx', content);
