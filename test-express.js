const express = require('express');
const app = express();
app.post('/api/projects/:id/stitch-master', (req, res) => res.json({matched: true, id: req.params.id}));
app.all('/api/*', (req, res) => res.status(404).json({error: 'not found'}));
app.post('*', (req, res) => res.status(200).send('<html>fallback</html>'));
app.listen(3002, () => console.log('started'));
