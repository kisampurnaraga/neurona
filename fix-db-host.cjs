const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
if (!code.includes('process.env.SQL_HOST =')) {
  code = "process.env.SQL_HOST = '/app/cloudsql/correctorv1:asia-southeast1:ai-studio-5be7e72c';\n" + code;
  fs.writeFileSync('server.ts', code);
  console.log('Fixed server.ts');
}
