const fs = require('fs');
let content = fs.readFileSync('src/shared/types.ts', 'utf8');

// The file has createdAt/updatedAt duplicated. Let's fix this.
// Remove the string ones I added at 214-215, keeping the Date ones (or vice versa, let's look at how they are used).
// Usually we want them to be string or Date, but let's just make it `string | Date`.
content = content.replace(
  /  createdAt: string;\n  updatedAt: string;\n/,
  ""
);

content = content.replace(
  /  createdAt\?: Date;\n  updatedAt\?: Date;\n\}/,
  "  createdAt?: string | Date;\n  updatedAt?: string | Date;\n}"
);

fs.writeFileSync('src/shared/types.ts', content);
