const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.N8N_MOCK_PORT || 5678);
const logFile = path.join(__dirname, '..', 'logs', 'n8n-mock.log');

app.use(express.json());

function appendLog(entry) {
  const line = `${new Date().toISOString()} ${entry}\n`;
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, line);
}

app.post('/webhook/settlement-reconciliation', (req, res) => {
  const payload = req.body || {};
  appendLog(`received ${JSON.stringify(payload)}`);
  console.log('n8n mock received payload:', JSON.stringify(payload));
  res.status(200).json({
    success: true,
    message: 'mock n8n webhook received',
    received: payload
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok' });
});

app.listen(port, () => {
  console.log(`Mock n8n webhook server listening on http://localhost:${port}`);
});
