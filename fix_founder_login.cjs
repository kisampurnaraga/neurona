const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldLogin = `      const founderUser = await userDatabase.getUserByEmail('ia.asep12@gmail.com') || await userDatabase.getUser('founder_root_001');
      const token = generateToken(founderUser);`;

const newLogin = `      let founderUser = await userDatabase.getUserByEmail('ia.asep12@gmail.com') || await userDatabase.getUser('founder_root_001');
      if (!founderUser) {
        founderUser = {
          uid: 'founder_root_001',
          email: 'ia.asep12@gmail.com',
          name: 'Master Architect',
          role: 'founder',
          credits: 999999,
          statusAktif: true,
          packageTier: 'founder'
        };
        await userDatabase.setUser('founder_root_001', founderUser);
      }
      const token = generateToken(founderUser);`;

content = content.replace(oldLogin, newLogin);
fs.writeFileSync('server.ts', content);
