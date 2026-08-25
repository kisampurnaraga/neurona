const fs = require('fs');
let path = 'src/components/CreditTopUpModal.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/const getTelegramUrl = \(\) => \{[\s\S]*?\};/g, '');
content = content.replace(/const botUsername = paymentConfig.telegramBotUsername \|\| 'NeuronnaAIBot';/g, '');
fs.writeFileSync(path, content);
