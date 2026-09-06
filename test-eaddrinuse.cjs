const http = require('http');
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION:', err.code);
  process.exit(1);
});
const srv1 = http.createServer();
srv1.listen(9090);
srv1.on('listening', () => {
  const srv2 = http.createServer();
  srv2.on('error', (err) => {
    console.log('SRV2 ERROR EVENT:', err.code);
  });
  srv2.listen(9090);
});
