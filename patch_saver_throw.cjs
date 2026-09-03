const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf-8');

const targetCode = `  } catch (err: any) {
    console.error(\`[LocalSaver] Failed to download or process file locally:\`, err);
  }

  // === CLOUD RUN PRODUCTION HARDENING (DIRECT STREAMING TO GCS) ===`;

const replacementCode = `  } catch (err: any) {
    console.error(\`[LocalSaver] Failed to download or process file locally:\`, err);
    throw err; // MUST THROW so Orchestrator knows the download failed!
  }

  // === CLOUD RUN PRODUCTION HARDENING (DIRECT STREAMING TO GCS) ===`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacementCode);
  fs.writeFileSync('server/orchestrator.ts', code);
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
