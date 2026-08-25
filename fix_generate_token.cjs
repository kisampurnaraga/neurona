const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/generateToken\((.*?),\s*\d+\)/g, "generateToken($1)");
content = content.replace(/await await userDatabase/g, "await userDatabase");
// also fix the setUser we broke earlier
content = content.replace(/userDatabase\.setUser\((.*?)\)/g, "userDatabase.setUser($1, $1)");
// wait, userDatabase.setUser(userId, newUser) became userDatabase.setUser(userId).
// Let me just revert the setUser regex and do it properly.

// Let's just fix it manually for setUser:
content = content.replace(/userDatabase\.setUser\(existing\.uid\)/g, "await userDatabase.setUser(existing.uid, existing)");
content = content.replace(/userDatabase\.setUser\(userId\)/g, "await userDatabase.setUser(userId, newUser)");
content = content.replace(/userDatabase\.setUser\(sample\.uid\)/g, "await userDatabase.setUser(sample.uid, sample)");

fs.writeFileSync('server.ts', content);
